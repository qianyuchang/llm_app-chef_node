import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import Memory from 'lowdb/adapters/Memory';
import path from 'path';
import fs from 'fs';

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

// Helper to try initializing DB at a specific path
function tryInitializeDb(filePath: string): any {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      // Use try-catch for mkdir specifically to handle permission issues gracefully
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (mkdirError) {
        console.error(`Error creating directory ${dir}:`, mkdirError);
        return null;
      }
    }
    const adapter = new FileSync<DatabaseSchema>(filePath);
    const db = (low as any)(adapter);
    db.defaults({ recipes: MOCK_RECIPES, categories: INITIAL_CATEGORIES }).write();
    console.log(`Database initialized successfully at: ${filePath}`);
    return db;
  } catch (error) {
    console.error(`Failed to initialize database at ${filePath}:`, error);
    return null;
  }
}

let db: any;

// Strategy 1: Railway Volume (if configured)
// Use process.env['RAILWAY_VOLUME_MOUNT_PATH'] to be safe with types if needed
const railwayPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'db.json') 
  : null;

if (railwayPath) {
  console.log(`Attempting to use Railway Volume at: ${railwayPath}`);
  db = tryInitializeDb(railwayPath);
}

// Strategy 2: Local File (Fallback)
// Use (process as any).cwd() to ensure it works in various TS environments
if (!db) {
  const localPath = path.join((process as any).cwd(), 'db.json');
  console.log(`Attempting to use local file at: ${localPath}`);
  db = tryInitializeDb(localPath);
}

// Strategy 3: In-Memory (Last Resort to keep server alive)
if (!db) {
  console.warn('CRITICAL: File storage failed. Falling back to In-Memory database. Data will be lost on restart.');
  const adapter = new Memory<DatabaseSchema>('db');
  db = (low as any)(adapter);
  db.defaults({ recipes: MOCK_RECIPES, categories: INITIAL_CATEGORIES }).write();
}

export default db;