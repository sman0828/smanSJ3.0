
import React from 'react';
import { 
  ShoppingBasket, Utensils, Zap, MoreHorizontal, 
  Droplets, Flame, Phone, TrainFront, 
  Shirt, Wrench, Soup, Hotel, Ticket, DollarSign,
  Package, Sparkles, HelpCircle, Coffee
} from 'lucide-react';

export interface CategoryItem {
  label: string;
  displayLabel: string;
  color: string;
  icon: React.ReactNode;
}

export interface CategoryGroup {
  name: string;
  items: CategoryItem[];
}

// 优化后的彩色莫兰迪色系（提升了饱和度，适合作为彩色图标底色）
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: '购物大类',
    items: [
      { label: '菜篮子', displayLabel: '菜篮子', color: '#7FB3D5', icon: <ShoppingBasket size={18} /> },
      { label: '干货调料', displayLabel: '干货调料', color: '#A9DFBF', icon: <Soup size={18} /> },
      { label: '日用五金', displayLabel: '日用五金', color: '#F7DC6F', icon: <Wrench size={18} /> },
      { label: '服饰', displayLabel: '服饰', color: '#E59866', icon: <Shirt size={18} /> },
      { label: '购物其他', displayLabel: '其他', color: '#D2B4DE', icon: <Package size={18} /> },
    ]
  },
  {
    name: '娱乐大类',
    items: [
      { label: '餐饮', displayLabel: '餐饮', color: '#EC7063', icon: <Coffee size={18} /> },
      { label: '交通', displayLabel: '交通', color: '#5DADE2', icon: <TrainFront size={18} /> },
      { label: '住宿', displayLabel: '住宿', color: '#58D68D', icon: <Hotel size={18} /> },
      { label: '票务', displayLabel: '票务', color: '#F4D03F', icon: <Ticket size={18} /> },
      { label: '娱乐其他', displayLabel: '其他', color: '#AF7AC5', icon: <Sparkles size={18} /> },
    ]
  },
  {
    name: '服务大类',
    items: [
      { label: '水', displayLabel: '水', color: '#48C9B0', icon: <Droplets size={18} /> },
      { label: '电', displayLabel: '电', color: '#F5B041', icon: <Zap size={18} /> },
      { label: '燃', displayLabel: '燃', color: '#EB984E', icon: <Flame size={18} /> },
      { label: '话', displayLabel: '话', color: '#52BE80', icon: <Phone size={18} /> },
      { label: '服务其他', displayLabel: '其他', color: '#AAB7B8', icon: <HelpCircle size={18} /> },
    ]
  },
  {
    name: '其他大类',
    items: [
      { label: '其他', displayLabel: '其他', color: '#85929E', icon: <MoreHorizontal size={18} /> },
    ]
  }
];

export const INCOME_CATEGORY: CategoryItem = {
  label: '收入',
  displayLabel: '收入',
  color: '#2ECC71',
  icon: <DollarSign size={18} />
};

export const CHART_COLORS = [
  '#7FB3D5', '#EC7063', '#48C9B0', '#85929E', '#E59866',
  '#5DADE2', '#F4D03F', '#A9DFBF', '#AF7AC5', '#58D68D'
];
