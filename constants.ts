import { Recipe } from './types';

export const INITIAL_CATEGORIES = ['炒菜', '炖菜', '清蒸', '甜品', '凉菜', '汤羹', '其他'];

export const PROFICIENCY_TEXT: Record<number, string> = {
  1: '初次尝试',
  2: '略知一二',
  3: '渐入佳境',
  4: '得心应手',
  5: '炉火纯青'
};

export const MOCK_RECIPES: Recipe[] = [
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
  },
  {
    id: '3',
    title: '番茄牛腩',
    category: '炖菜',
    coverImage: 'https://picsum.photos/400/300?random=3',
    proficiency: 4,
    ingredients: [{name: '牛腩', amount: '500g'}, {name: '番茄', amount: '3个'}],
    steps: ['牛腩焯水', '炒出番茄汁', '小火慢炖2小时'],
    logs: [],
    createdAt: Date.now() - 20000
  },
  {
    id: '4',
    title: '芒果西米露',
    category: '甜品',
    coverImage: 'https://picsum.photos/400/450?random=4',
    proficiency: 5,
    ingredients: [{name: '芒果', amount: '2个'}, {name: '西米', amount: '50g'}],
    steps: ['煮西米至透明', '芒果打成果泥', '混合椰浆'],
    logs: [],
    createdAt: Date.now() - 30000
  },
  {
    id: '5',
    title: '蒜蓉油麦菜',
    category: '炒菜',
    coverImage: 'https://picsum.photos/400/410?random=5',
    proficiency: 2,
    ingredients: [{name: '油麦菜', amount: '1把'}, {name: '蒜', amount: '5瓣'}],
    steps: ['爆香蒜末', '大火快炒', '加盐出锅'],
    logs: [],
    createdAt: Date.now() - 40000
  }
];