// Vietnamese display labels for backend enum values (SPEC taxonomy)

export const TYPE_LABEL: Record<string, string> = {
  t_shirt: 'Áo thun',
  shirt: 'Áo sơ mi',
  pants: 'Quần tây',
  jeans: 'Quần jeans',
  shorts: 'Quần short',
  dress: 'Váy liền',
  skirt: 'Chân váy',
  jacket: 'Áo khoác',
  coat: 'Áo coat',
  hoodie: 'Hoodie',
  sweater: 'Áo len',
  shoes: 'Giày',
  sneakers: 'Sneakers',
  boots: 'Boots',
  bag: 'Túi xách',
  accessory: 'Phụ kiện',
};

export const OCCASION_LABEL: Record<string, string> = {
  school: 'Đi học',
  work: 'Đi làm',
  casual: 'Đi chơi',
  party: 'Dự tiệc',
  date: 'Hẹn hò',
  travel: 'Du lịch',
};

export const SEASON_LABEL: Record<string, string> = {
  spring_summer: 'Xuân hè',
  fall_winter: 'Thu đông',
  all_season: 'Quanh năm',
};

export const STYLE_LABEL: Record<string, string> = {
  casual: 'Casual',
  formal: 'Công sở',
  streetwear: 'Streetwear',
  sporty: 'Thể thao',
  elegant: 'Thanh lịch',
  minimalist: 'Tối giản',
};

// Ordered enum values for the tag-edit form (keys preserve insertion order above).
export const TYPE_VALUES = Object.keys(TYPE_LABEL);
export const STYLE_VALUES = Object.keys(STYLE_LABEL);
export const SEASON_VALUES = Object.keys(SEASON_LABEL);
export const OCCASION_VALUES = Object.keys(OCCASION_LABEL);

// Category → type values (for filter bar)
export type ClosetCategory = 'all' | 'tops' | 'bottoms' | 'shoes' | 'accessories';

export const CATEGORY_LABEL: Record<ClosetCategory, string> = {
  all: 'Tất cả',
  tops: 'Áo',
  bottoms: 'Quần & Váy',
  shoes: 'Giày',
  accessories: 'Phụ kiện',
};

export const CATEGORY_TYPES: Record<ClosetCategory, string[] | null> = {
  all: null,
  tops: ['t_shirt', 'shirt', 'hoodie', 'sweater', 'jacket', 'coat'],
  bottoms: ['pants', 'jeans', 'shorts', 'skirt', 'dress'],
  shoes: ['shoes', 'sneakers', 'boots'],
  accessories: ['bag', 'accessory'],
};

export function fmtWornCount(count: number): string {
  if (count === 0) return 'Chưa mặc lần nào';
  if (count === 1) return 'Đã mặc 1 lần';
  return `Đã mặc ${count} lần`;
}
