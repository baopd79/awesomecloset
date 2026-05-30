# Redis và ARQ trong AwesomeCloset

## Redis là gì?

Redis (Remote Dictionary Server) là **in-memory data store** — lưu dữ liệu trực tiếp trên RAM thay vì disk. Tốc độ đọc/ghi cực nhanh (~100k ops/giây), phù hợp cho các tác vụ cần latency thấp.

Redis không phải database chính — không có schema, không có join, không có ACID transaction đầy đủ. Dùng Redis để giải quyết những bài toán mà SQL database làm được nhưng chậm hoặc phức tạp hơn cần thiết.

**Các use case phổ biến:**
| Use case | Cách dùng |
|---|---|
| Job queue | LPUSH/BRPOP, hoặc dùng thư viện như ARQ |
| Caching | SET key value EX 3600 |
| Rate limiting | INCR + EXPIRE |
| Session storage | HSET session:id field value |
| Pub/Sub | PUBLISH / SUBSCRIBE |
| Leaderboard | Sorted Set (ZADD / ZRANK) |

---

## Cách 1 — App-level Redis Client (redis-py)

Dùng trực tiếp `redis-py` hoặc `redis.asyncio` để thao tác Redis. Đây là lớp thấp nhất, cho phép dùng mọi lệnh Redis.

```python
import redis.asyncio as redis

# tạo connection pool
pool = redis.ConnectionPool.from_url("redis://localhost:6379")
client = redis.Redis(connection_pool=pool)

# dùng
await client.set("key", "value", ex=3600)
value = await client.get("key")
await client.lpush("my_queue", "job_data")
```

**Khi nào dùng:**
- Caching response của API
- Rate limiting (với slowapi hoặc tự viết)
- Lưu data tạm thời (OTP, session, token blacklist)
- Pub/Sub realtime
- Bất kỳ thứ gì cần thao tác Redis trực tiếp

**Nhược điểm khi tự làm job queue:**
Nếu dùng Redis thuần để làm job queue, bạn phải tự xây dựng:
- Serialization/deserialization job arguments
- Retry logic với exponential backoff
- Job status tracking (pending/running/complete/failed)
- Dead letter queue
- Job deduplication
- Worker health check
- Timeout handling

→ Phức tạp và dễ bug.

---

## Cách 2 — ARQ Redis Pool (hiện tại)

**ARQ** là thư viện job queue built on top of `redis.asyncio`. Thay vì thao tác Redis trực tiếp, bạn dùng `ArqRedis` — một wrapper có sẵn các method cao hơn.

```python
from arq import create_pool
from arq.connections import RedisSettings

# tạo pool — trả về ArqRedis, không phải Redis thông thường
arq: ArqRedis = await create_pool(RedisSettings(host="localhost", port=6379))

# enqueue job — ARQ tự serialize args, lưu metadata vào Redis hash
await arq.enqueue_job("process_item", item_id="abc-123")

# check status
job = await arq.job("job_id")
status = await job.status()
```

**ARQ tự xử lý:**
- Lưu job thành Redis hash với đầy đủ metadata (args, kwargs, enqueue time, tries, status)
- Worker poll Redis, nhận job, chạy function tương ứng
- Retry tự động với `max_tries` và delay giữa các lần
- Job timeout nếu worker chết giữa chừng
- Job deduplication (tùy chọn) qua `job_id`

**Cấu trúc data trong Redis khi enqueue:**

```
arq:job:<job_id>   →  Hash {
    function: "process_item",
    args: '["abc-123"]',
    kwargs: '{}',
    enqueue_time: 1234567890.123,
    job_try: 1,
    status: "queued"
}

arq:queue          →  Sorted Set { job_id: score=enqueue_time }
```

Worker liên tục `BZPOPMIN arq:queue` (blocking pop) để nhận job mới.

---

## So sánh

| | App-level Redis Client | ARQ Redis Pool |
|---|---|---|
| API | Lệnh Redis raw (`SET`, `GET`, `LPUSH`...) | `enqueue_job`, `job_status` |
| Use case | General purpose | Job queue |
| Setup | `redis.ConnectionPool` + `redis.Redis` | `arq.create_pool()` |
| Type | `redis.asyncio.Redis` | `ArqRedis` |
| Retry logic | Tự viết | Built-in (`max_tries`) |
| Status tracking | Tự viết | Built-in |
| Worker | Tự viết | ARQ worker (`arq backend.workers.main.WorkerSettings`) |
| Overhead | Thấp | Cao hơn một chút (metadata) |

---

## Tại sao chọn ARQ

AwesomeCloset chỉ dùng Redis cho **1 mục đích duy nhất**: background job queue (rembg + Gemini tagging). ARQ giải quyết đúng bài toán này, không cần tự xây dựng queue infrastructure.

**Triển khai hiện tại:**

```python
# main.py — khởi tạo một lần trong lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.arq = await create_pool(get_redis_settings())
    yield
    await app.state.arq.aclose()
```

```python
# core/dependencies.py — inject vào endpoints
async def get_arq(request: Request) -> ArqRedis:
    return request.app.state.arq

ArqDep = Annotated[ArqRedis, Depends(get_arq)]
```

```python
# workers/main.py — worker settings
class WorkerSettings:
    functions = [process_item]
    redis_settings = get_redis_settings()
    max_jobs = 10
    job_timeout = 300
```

API server và ARQ worker dùng **cùng một Redis instance** nhưng là 2 process riêng biệt — API chỉ enqueue, worker chỉ dequeue và xử lý.

---

## Nếu sau này cần thêm Redis cho mục đích khác

Ví dụ thêm caching hoặc rate limiting — lúc đó mới cần thêm app-level Redis client song song:

```python
# Thêm vào lifespan nếu cần
app.state.arq = await create_pool(...)       # job queue — dùng ArqRedis
app.state.cache = redis.Redis(pool=...)      # caching — dùng redis.asyncio.Redis
```

Hai client này độc lập, có thể trỏ vào cùng Redis instance (khác database index) hoặc khác instance tùy nhu cầu.
