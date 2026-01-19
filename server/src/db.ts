import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import path from 'path';

// Define the shape of our database
interface Recipe {
  id: string;
  title: string;
  category: string;
  coverImage: string;
  proficiency: number;
  sourceLink?: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  logs: { id: string; date: number; image: string; note: string }[];
  createdAt: number;
}

interface DatabaseSchema {
  recipes: Recipe[];
  categories: string[];
}

// Initial Data
const INITIAL_CATEGORIES = ['炒菜', '炖菜', '清蒸', '甜品', '凉菜', '汤羹', '其他'];
const MOCK_RECIPES: Recipe[] = [
  {
    id: '1',
    title: '香菇滑鸡',
    category: '炒菜',
    coverImage: 'https://picsum.photos/400/400?random=1',
    proficiency: 1,
    ingredients: [{name: '鸡腿', amount: '2个'}, {name: '干香菇', amount: '10朵'}],
    steps: ['香菇泡发', '鸡肉切块', '大火爆炒'],
    logs: [],
    createdAt: Date.now()
  },
  {
    id: '2',
    title: '清蒸鲈鱼',
    category: '清蒸',
    coverImage: 'https://picsum.photos/400/500?random=2',
    proficiency: 3,
    ingredients: [{name: '鲈鱼', amount: '1条'}, {name: '葱姜', amount: '适量'}],
    steps: ['鱼身抹盐腌制10分钟', '水开后上锅蒸8分钟', '淋上蒸鱼豉油和热油'],
    logs: [],
    createdAt: Date.now() - 10000
  }
];

const adapter = new FileSync<DatabaseSchema>(path.join(__dirname, '../../db.json'));
const db = (low as any)(adapter);

// Initialize with defaults if empty
db.defaults({ recipes: MOCK_RECIPES, categories: INITIAL_CATEGORIES }).write();

export default db;