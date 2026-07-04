import type { Member } from '../types'

export const MESS_NAME = 'Haowa Bhobon'
export const APP_TAGLINE = 'Mess Manager'

export const BOOTSTRAP_ADMIN = 'tanvirovi6@gmail.com'

// Cutoffs in minutes since midnight, Asia/Dhaka
export const LUNCH_CUTOFF_MIN = 9 * 60 + 30 // 09:30
export const DINNER_CUTOFF_MIN = 18 * 60 // 18:00
export const KHALA_DEFAULT_PAISA = 4000 * 100 // total cook bill, split equally
export const DUTY_DAYS = 3

// Doc id = lowercase email for real members. Pending members (no email yet)
// get a "pending-" id that can never match a Firebase Auth email, so they
// appear in reports but cannot log in until an admin sets a real email.
export const SEED_MEMBERS: Member[] = [
  { email: 'tanvirovi6@gmail.com', name: 'Tanvir Hossain Ovi', nickname: 'Ovi', phone: '01863587030', role: 'admin', active: true },
  { email: 'sohagmohammad681@gmail.com', name: 'Mohammad Sohag', nickname: 'Sohag', phone: '01307751333', role: 'manager', active: true },
  { email: 'rafi151985151985@gmail.com', name: 'Yasin Arafat Rafi', nickname: 'Rafi', phone: '01751844205', role: 'member', active: true },
  { email: 'sakibrasel1999@gmail.com', name: 'M. R. Shakib', nickname: 'Shakib', phone: '01837323899', role: 'member', active: true },
  { email: 'sagornurcupharmacy2100@gmail.com', name: 'Nur Hossain', nickname: 'Nur', phone: '01701956862', role: 'member', active: true },
  { email: 'shahriyaahmed458@gmail.com', name: 'Shahriya Ahammed', nickname: 'Shahriya', phone: '01404313577', role: 'member', active: true },
  { email: 'pending-sohan', name: 'Sohan', nickname: 'Sohan', phone: '', role: 'member', active: true },
  { email: 'pending-zihan', name: 'Zihan', nickname: 'Zihan', phone: '', role: 'member', active: true },
  { email: 'pending-mamun', name: 'Mamun', nickname: 'Mamun', phone: '', role: 'member', active: true },
]

export const isRealEmail = (id: string): boolean => id.includes('@')

export interface MenuItem {
  name: string
  emoji: string
  unit: string
}

export const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'dozen', 'packet', 'bundle', 'tk']

export const MENU_ITEMS: MenuItem[] = [
  { name: 'Rice', emoji: '🍚', unit: 'kg' },
  { name: 'Chicken', emoji: '🍗', unit: 'kg' },
  { name: 'Beef', emoji: '🥩', unit: 'kg' },
  { name: 'Rui Fish', emoji: '🐟', unit: 'kg' },
  { name: 'Katla Fish', emoji: '🐡', unit: 'kg' },
  { name: 'Pabda Fish', emoji: '🐠', unit: 'kg' },
  { name: 'Other Fish', emoji: '🎣', unit: 'kg' },
  { name: 'Eggs', emoji: '🥚', unit: 'dozen' },
  { name: 'Potato', emoji: '🥔', unit: 'kg' },
  { name: 'Onion', emoji: '🧅', unit: 'kg' },
  { name: 'Garlic', emoji: '🧄', unit: 'g' },
  { name: 'Ginger', emoji: '🫚', unit: 'g' },
  { name: 'Green Chili', emoji: '🌶️', unit: 'g' },
  { name: 'Eggplant', emoji: '🍆', unit: 'kg' },
  { name: 'Okra', emoji: '🫛', unit: 'kg' },
  { name: 'Cucumber', emoji: '🥒', unit: 'kg' },
  { name: 'Bottle Gourd', emoji: '🍈', unit: 'pcs' },
  { name: 'Teasel Gourd', emoji: '🍏', unit: 'kg' },
  { name: 'Leafy Greens', emoji: '🥬', unit: 'bundle' },
  { name: 'Tomato', emoji: '🍅', unit: 'kg' },
  { name: 'Lentils', emoji: '🫘', unit: 'kg' },
  { name: 'Cooking Oil', emoji: '🫗', unit: 'L' },
  { name: 'Salt', emoji: '🧂', unit: 'packet' },
  { name: 'Sugar', emoji: '🍬', unit: 'kg' },
  { name: 'Ground Spices', emoji: '🥘', unit: 'packet' },
  { name: 'Biryani Masala', emoji: '🍛', unit: 'packet' },
  { name: 'Fish Masala', emoji: '🍲', unit: 'packet' },
  { name: 'Cardamom', emoji: '🌿', unit: 'g' },
  { name: 'Milk Powder', emoji: '🥛', unit: 'packet' },
  { name: 'Tea Leaves', emoji: '🍵', unit: 'packet' },
  { name: 'Flour', emoji: '🌾', unit: 'kg' },
  { name: 'Puffed Rice', emoji: '🍿', unit: 'kg' },
  { name: 'Bananas', emoji: '🍌', unit: 'dozen' },
  { name: 'Bread', emoji: '🍞', unit: 'pcs' },
  { name: 'Biscuits', emoji: '🍪', unit: 'packet' },
  { name: 'Vermicelli', emoji: '🍝', unit: 'packet' },
  { name: 'Hand Wash', emoji: '🧼', unit: 'pcs' },
  { name: 'Dish Soap', emoji: '🧽', unit: 'pcs' },
  { name: 'Toilet Cleaner', emoji: '🚽', unit: 'pcs' },
  { name: 'Drinking Water', emoji: '💧', unit: 'pcs' },
  { name: 'Groceries (Misc)', emoji: '🛒', unit: 'tk' },
  { name: 'Other', emoji: '📦', unit: 'tk' },
]

export const AVATAR_COLORS = [
  'from-rose-500 to-red-600',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-600',
  'from-sky-400 to-blue-600',
  'from-violet-400 to-purple-600',
  'from-pink-400 to-rose-600',
  'from-lime-400 to-green-600',
  'from-cyan-400 to-teal-500',
  'from-fuchsia-400 to-pink-600',
]
