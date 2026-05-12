/**
 * Mock Data for MyPreLove
 * These objects mirror the Django Backend models exactly.
 * Use these for UI development when the backend is offline or during testing.
 */

export const MOCK_USER = {
  id: 1,
  username: 'adam_anwar',
  email: 'adam@example.com',
};

export const MOCK_PROFILES = [
  {
    id: 1,
    username: 'adam_anwar',
    trust_score: 85.5,
    is_verified: true,
    profile_picture: null,
  },
  {
    id: 2,
    username: 'test_buyer',
    trust_score: 45.0,
    is_verified: false,
    profile_picture: null,
  },
];

export const MOCK_CATEGORIES = [
  { id: 1, name: 'Electronics', icon_name: 'cpu' },
  { id: 2, name: 'Fashion', icon_name: 'shirt' },
  { id: 3, name: 'Home & Living', icon_name: 'home' },
  { id: 4, name: 'Books', icon_name: 'book-open' },
];

export const MOCK_ITEMS = [
  {
    id: 1,
    seller: 1,
    seller_name: 'adam_anwar',
    category: 1,
    category_name: 'Electronics',
    name: 'iPhone 13 Pro',
    description: 'Used for 1 year, very good condition. Includes original box.',
    price: 2500.00,
    is_fully_functional: true,
    has_scratches: true,
    has_dents_cracks: false,
    has_original_box: true,
    has_receipt: true,
    calculated_grade: 'B',
    is_sold: false,
    images: [],
    created_at: '2026-05-10T10:00:00Z',
  },
  {
    id: 2,
    seller: 2,
    seller_name: 'test_buyer',
    category: 2,
    category_name: 'Fashion',
    name: 'Vintage Denim Jacket',
    description: 'Never worn, tags still on.',
    price: 150.00,
    is_fully_functional: true,
    has_scratches: false,
    has_dents_cracks: false,
    has_original_box: false,
    has_receipt: false,
    calculated_grade: 'A',
    is_sold: false,
    images: [],
    created_at: '2026-05-11T12:00:00Z',
  },
];

export const MOCK_MESSAGES = [
  {
    id: 1,
    sender: 2,
    sender_name: 'test_buyer',
    receiver: 1,
    receiver_name: 'adam_anwar',
    item: 1,
    content: 'Hi! Is the iPhone still available?',
    timestamp: '2026-05-11T14:00:00Z',
    is_read: true,
  },
  {
    id: 2,
    sender: 1,
    sender_name: 'adam_anwar',
    receiver: 2,
    receiver_name: 'test_buyer',
    item: 1,
    content: 'Yes, it is! Are you interested?',
    timestamp: '2026-05-11T14:05:00Z',
    is_read: false,
  },
];

export const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: 'New Message',
    content: 'You have a new message from test_buyer.',
    is_read: false,
    created_at: '2026-05-11T14:00:00Z',
  },
  {
    id: 2,
    title: 'Welcome to MyPreLove!',
    content: 'Start buying and selling with trust.',
    is_read: true,
    created_at: '2026-05-10T08:00:00Z',
  },
];
