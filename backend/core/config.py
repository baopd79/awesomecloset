from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    redis_url: str = "redis://localhost:6379"

    gemini_api_key: str
    gemini_tagging_model: str = "gemini-2.0-flash"
    gemini_suggestion_model: str = "gemini-2.0-flash"

    openweathermap_api_key: str
    removebg_api_key: str = ""

    app_env: str = "development"
    secret_key: str


settings = Settings()
