-- ============================================================================
-- KinetoFun — Gesture Chef catalog text for the Burger Truck rebuild
-- Run against the app's PostgreSQL database (AWS RDS) with a role that can
-- write public.games. Safe to re-run.
-- ============================================================================

update public.games set
  tagline           = 'Run a burger truck with your hands: close to grab, open to drop.',
  description       = 'Customers line up with picture orders. Close your hand over a box to grab a bun, a patty or a topping, '
                      'carry it, and open your hand to drop it on the grill, the plate or a customer. Take patties off the '
                      'grill before they burn, stack the burger from bottom bun to top bun, and carry the plate to the right '
                      'customer before their patience runs out. Ten days add cheese, lettuce, fries, tomato, fizzy drinks, '
                      'double burgers, onion and bacon; earn the day''s coins goal for stars and tips for quick service.',
  short_description = 'Grill, stack and serve burgers by grabbing and dropping with your hand.',
  updated_at        = now()
where id = 'gesture-chef';
