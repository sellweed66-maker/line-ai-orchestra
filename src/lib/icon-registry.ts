// Curated Lucide icon library for the logo picker.
import {
  Satellite, Store, ShoppingBag, ShoppingCart, Coffee, UtensilsCrossed, Pizza, Croissant, CakeSlice, IceCreamCone,
  Shirt, Gem, Flower2, Leaf, Sparkles as Spark, Bot, Cpu, Zap, Rocket, Orbit, Globe, Package, Truck, Receipt,
  Wallet, Store as Shop, Heart, Star, Crown, Sun, Moon, Car, Wrench, Scissors, Dumbbell, Book, Camera, Music,
  PawPrint, Building2, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Satellite, Store, ShoppingBag, ShoppingCart, Coffee, UtensilsCrossed, Pizza, Croissant, CakeSlice, IceCreamCone,
  Shirt, Gem, Flower2, Leaf, Spark, Bot, Cpu, Zap, Rocket, Orbit, Globe, Package, Truck, Receipt, Wallet, Shop,
  Heart, Star, Crown, Sun, Moon, Car, Wrench, Scissors, Dumbbell, Book, Camera, Music, PawPrint, Building2,
};

export function getIcon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Satellite;
}
