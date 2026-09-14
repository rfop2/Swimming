-- Extensible set of admin-granted user flags (e.g. countyAdmin, regionalAdmin),
-- stored as a JSON array so further attributes can be added without new columns.
ALTER TABLE User
  ADD COLUMN attributes JSON DEFAULT NULL AFTER role;
