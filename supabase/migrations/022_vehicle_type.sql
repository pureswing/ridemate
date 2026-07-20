-- Optional vehicle body type (Sedan/SUV/Minivan/Electric), per
-- ui_kits/ridemate-app/VehicleEdit.jsx's VEHICLE_CLASSES chip picker.
ALTER TABLE public.vehicle_profiles
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
