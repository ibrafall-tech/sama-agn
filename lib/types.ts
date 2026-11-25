export const CATEGORIES = ["Plat", "Accompagnement", "Boisson", "Dessert"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Dish = {
  id: string;
  name: string;
  price: number;
  category: Category;
  position: number;
};

/** A line keeps the name and price at order time, so a later menu edit never changes it. */
export type OrderLine = { dishId: string; name: string; price: number; qty: number };

export type Order = {
  id: string;
  personId: string;
  name: string;
  note: string;
  lines: OrderLine[];
  total: number;
  createdBy: string;
  updatedAt: string;
};

export type Day = {
  date: string;
  restaurant: string;
  deadline: string;
  runnerPid: string | null;
  runnerName: string | null;
  closed: boolean;
  updatedAt: string;
};

export type Me = { pid: string; name: string; admin: boolean };

export type DayPayload = {
  date: string;
  today: string;
  day: Day | null;
  dishes: Dish[];
  orders: Order[];
  lastOrder: Order | null;
  me: Me;
};

export type Suggestion = { name: string; price: number; category: Category; count: number };

export type HistoryPayload = {
  suggestions: Suggestion[];
  previous: { date: string; restaurant: string; deadline: string; dishes: Omit<Dish, "id" | "position">[] } | null;
};
