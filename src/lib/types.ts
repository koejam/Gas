export type Vehicle = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
};

export type FillUp = {
  id: string;
  user_id: string;
  vehicle_id: string;
  date: string;            // ISO date 'YYYY-MM-DD'
  mileage: number;
  gallons: number;
  price_per_gallon: number;
  total_price: number;
  created_at: string;
};

export type OilChange = {
  id: string;
  user_id: string;
  vehicle_id: string;
  date: string;            // ISO date
  mileage: number | null;
  notes: string | null;
  created_at: string;
};

export type NewFillUp = Omit<FillUp, 'id' | 'user_id' | 'created_at'>;
export type NewOilChange = Omit<OilChange, 'id' | 'user_id' | 'created_at'>;
export type NewVehicle = Omit<Vehicle, 'id' | 'user_id' | 'created_at'>;
