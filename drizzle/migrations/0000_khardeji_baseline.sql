-- Baseline for the remixed database: the tables, policies and functions were copied,
-- but access grants, triggers and starting data were not. Everything below is idempotent.

-- ===== Access grants =====
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT ON public.categories, public.listings, public.token_packs, public.boost_services, public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories, public.listings, public.token_packs, public.boost_services, public.plans TO authenticated;
GRANT ALL ON public.categories, public.listings, public.token_packs, public.boost_services, public.plans TO service_role;
GRANT SELECT, INSERT, DELETE ON public.listing_private TO authenticated;
GRANT ALL ON public.listing_private TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- ===== Helper functions =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_blocked(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT is_blocked FROM public.profiles WHERE id = _user_id), false)
$$;
REVOKE EXECUTE ON FUNCTION public.is_blocked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_blocked := OLD.is_blocked;
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.protect_profile_admin_fields() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  kind text := coalesce(NEW.raw_user_meta_data ->> 'account_type', 'particulier');
BEGIN
  IF kind NOT IN ('particulier', 'pro', 'entreprise') THEN
    kind := 'particulier';
  END IF;
  INSERT INTO public.profiles (id, full_name, phone, account_type, email)
  VALUES (
    NEW.id,
    left(coalesce(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''), 120),
    left(coalesce(NEW.raw_user_meta_data ->> 'phone', ''), 20),
    kind,
    coalesce(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- The site owner's address becomes admin once its email is confirmed; profile email follows auth email.
CREATE OR REPLACE FUNCTION public.handle_user_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = coalesce(NEW.email, '') WHERE id = NEW.id;
  END IF;
  IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'admin@khardeji.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_user_email() FROM PUBLIC, anon, authenticated;

-- ===== Triggers =====
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
DROP TRIGGER IF EXISTS on_auth_user_email ON auth.users;
CREATE TRIGGER on_auth_user_email
  AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS profiles_protect_admin_fields ON public.profiles;
CREATE TRIGGER profiles_protect_admin_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_fields();
DROP TRIGGER IF EXISTS categories_set_updated_at ON public.categories;
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS listings_set_updated_at ON public.listings;
CREATE TRIGGER listings_set_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS token_packs_set_updated_at ON public.token_packs;
CREATE TRIGGER token_packs_set_updated_at BEFORE UPDATE ON public.token_packs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS boost_services_set_updated_at ON public.boost_services;
CREATE TRIGGER boost_services_set_updated_at BEFORE UPDATE ON public.boost_services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS plans_set_updated_at ON public.plans;
CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Existing accounts (if any) get their profile and admin role.
INSERT INTO public.profiles (id, full_name, phone, email)
SELECT u.id,
       left(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), 120),
       left(coalesce(u.raw_user_meta_data ->> 'phone', ''), 20),
       coalesce(u.email, '')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
WHERE lower(email) = 'admin@khardeji.com' AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- ===== Starting data =====
INSERT INTO public.categories (slug, name, tagline, image, subcategories, sort_order) VALUES
  ('metaux', '{"ar":"خردة ومعادن","fr":"Ferraille et métaux","en":"Scrap and metals"}'::jsonb, '{"ar":"حديد، نحاس، ألمنيوم، إينوكس…","fr":"Fer, cuivre, aluminium, inox…","en":"Iron, copper, aluminium, stainless…"}'::jsonb, 'listing-scrap-iron', ARRAY['Fer', 'Cuivre', 'Aluminium', 'Inox', 'Laiton', 'Zinc', 'Câbles électriques', 'Autres métaux']::text[], 1),
  ('pieces-auto', '{"ar":"قطع غيار السيارات","fr":"Pièces automobiles","en":"Car parts"}'::jsonb, '{"ar":"محركات، علب سرعة، جنط، بطاريات…","fr":"Moteurs, boîtes, jantes, batteries…","en":"Engines, gearboxes, rims, batteries…"}'::jsonb, 'listing-engine', ARRAY['Moteurs', 'Boîtes de vitesses', 'Portières', 'Pare-chocs', 'Jantes', 'Pneus', 'Batteries', 'Pièces électroniques', 'Accessoires automobiles']::text[], 2),
  ('vehicules', '{"ar":"عربات مصدومة","fr":"Véhicules accidentés","en":"Damaged vehicles"}'::jsonb, '{"ar":"سيارات، موتوات وشاحنات للقطع","fr":"Voitures, motos, camions pour pièces","en":"Cars, motorbikes, trucks for parts"}'::jsonb, 'listing-accident-car', ARRAY['Voitures accidentées', 'Véhicules hors service', 'Véhicules pour pièces', 'Motos', 'Camions']::text[], 3),
  ('industriel', '{"ar":"معدات صناعية","fr":"Matériel industriel","en":"Industrial equipment"}'::jsonb, '{"ar":"آلات، معدات، حضائر","fr":"Machines, équipements, chantier","en":"Machines, equipment, construction"}'::jsonb, 'listing-lathe', ARRAY['Machines', 'Équipements', 'Matériel électrique', 'Matériel de chantier']::text[], 4),
  ('recuperation', '{"ar":"مواد أخرى للرسكلة","fr":"Autres matériaux","en":"Other materials"}'::jsonb, '{"ar":"باليتات، براميل، خشب، بلاستيك…","fr":"Palettes, fûts, bois, plastiques…","en":"Pallets, drums, wood, plastics…"}'::jsonb, 'listing-recup', ARRAY['Palettes', 'Fûts et bidons', 'Bois', 'Plastiques', 'Divers']::text[], 5)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.listings (id, title, description, category, subcategory, governorate, city, price, unit, stock, sale_type, images, seller, featured, urgent, auction, status, published_at) VALUES
  ('cuivre-recupere-sfax', '{"ar":"نحاس مسترجع — خيوط وأنابيب منظفة","fr":"Cuivre récupéré — fils et tubes nettoyés","en":"Recovered copper — cleaned wires and tubes"}'::jsonb, '{"ar":"نحاس مسترجع ومفرز: خيوط مقشرة وأنابيب سباكة. سلعة نظيفة بلا بلاستيك. الوزن في البلاصة وإمكانية الشحن.","fr":"Cuivre de récupération trié : fils dénudés et tubes de plomberie. Marchandise propre, sans plastique. Pesée sur place, possibilité de chargement.","en":"Sorted recovered copper: stripped wires and plumbing tubes. Clean material, no plastic. Weighed on site, loading available."}'::jsonb, 'metaux', 'Cuivre', 'Sfax', '{"ar":"ساقية الزيت","fr":"Sakiet Ezzit","en":"Sakiet Ezzit"}'::jsonb, 28, 'kg', 150, 'fixe', ARRAY['listing-copper', 'listing-recup']::text[], '{"name":"Ferraille Ben Salah","kind":"pro","verified":true,"memberSince":"2023","phone":"+216 74 000 000"}'::jsonb, true, false, NULL, 'approved', '2026-11-08'),
  ('aluminium-profiles-nabeul', '{"ar":"ألمنيوم — بروفيلات وكانيت مضغوطة","fr":"Aluminium — profilés et canettes compactées","en":"Aluminium — profiles and compacted cans"}'::jsonb, '{"ar":"ألمنيوم في بالات وبروفيلات نجارة. مناسب للمسابك. السعر ينقص من 200 كغ فما فوق، قابل للنقاش.","fr":"Aluminium en balles et profilés de menuiserie. Idéal pour fonderie. Prix dégressif à partir de 200 kg, à discuter.","en":"Baled aluminium and window profiles. Ideal for foundries. Volume pricing from 200 kg, open to discussion."}'::jsonb, 'metaux', 'Aluminium', 'Nabeul', '{"ar":"قرمبالية","fr":"Grombalia","en":"Grombalia"}'::jsonb, 12, 'kg', 300, 'negociable', ARRAY['listing-aluminium']::text[], '{"name":"Recyclage Cap Bon","kind":"entreprise","verified":true,"memberSince":"2024","phone":"+216 72 000 000"}'::jsonb, false, false, NULL, 'approved', '2026-11-07'),
  ('moteur-1-6-ben-arous', '{"ar":"محرك بنزين 1.6 لتر — مفكوك ومجرّب","fr":"Moteur essence 1.6 L — démonté, testé","en":"1.6 L petrol engine — removed, tested"}'::jsonb, '{"ar":"بلوك محرك 1.6 بنزين مفكوك من سيارة 2016. الكومبريسيون مجرّبة. يُباع بلا إكسسوارات. فاتورة الكاس متوفرة.","fr":"Bloc moteur 1.6 essence démonté d''un véhicule de 2016. Compression testée. Vendu sans accessoires. Facture de la casse fournie.","en":"1.6 petrol engine block removed from a 2016 car. Compression tested. Sold without accessories. Scrapyard invoice provided."}'::jsonb, 'pieces-auto', 'Moteurs', 'Ben Arous', '{"ar":"مقرين","fr":"Mégrine","en":"Mégrine"}'::jsonb, 450, 'piece', 1, 'fixe', ARRAY['listing-engine', 'listing-gearbox']::text[], '{"name":"Casse Auto El Amen","kind":"entreprise","verified":true,"memberSince":"2022","phone":"+216 71 000 000"}'::jsonb, false, false, NULL, 'approved', '2026-11-09'),
  ('voiture-accidentee-sousse', '{"ar":"سيارة سيدان مصدومة من القدّام — للقطع","fr":"Berline accidentée avant — pour pièces","en":"Front-damaged saloon — for parts"}'::jsonb, '{"ar":"سيدان 2017 مصدومة من القدّام، المحرك سليم والداخل في حالة باهية. البطاقة الرمادية متوفرة، والمنصة تتثبت من ملف الملكية قبل غلق المزايدة.","fr":"Berline 2017 accidentée à l''avant, moteur intact, intérieur en bon état. Carte grise disponible, dossier de propriété vérifié par la plateforme avant clôture.","en":"2017 saloon with front damage, engine intact, interior in good condition. Registration available; ownership checked by the platform before closing."}'::jsonb, 'vehicules', 'Voitures accidentées', 'Sousse', '{"ar":"حمام سوسة","fr":"Hammam Sousse","en":"Hammam Sousse"}'::jsonb, 1500, 'piece', 1, 'enchere', ARRAY['listing-accident-car']::text[], '{"name":"Mehdi T.","kind":"particulier","verified":false,"memberSince":"2025","phone":"+216 22 000 000"}'::jsonb, true, false, '{"startPrice":1500,"increment":50,"endsInHours":31,"bids":[{"bidder":"A","amount":1500,"minutesAgo":610},{"bidder":"B","amount":1550,"minutesAgo":420},{"bidder":"C","amount":1650,"minutesAgo":185},{"bidder":"D","amount":1700,"minutesAgo":42}]}'::jsonb, 'approved', '2026-11-08'),
  ('ferraille-mixte-gabes', '{"ar":"خردة مختلطة — بوطرات وصفائح","fr":"Ferraille mixte — poutrelles et tôles","en":"Mixed scrap — beams and sheet metal"}'::jsonb, '{"ar":"دفعة خردة من الهدم: بوطرات IPN، صفائح وأنابيب. الشحن بالرافعة متوفر. البيع بالكيلوغرام.","fr":"Lot de ferraille issue de démolition : poutrelles IPN, tôles, tubes. Chargement par grue disponible. Vente au kilogramme.","en":"Demolition scrap lot: IPN beams, sheets, tubes. Crane loading available. Sold by the kilogram."}'::jsonb, 'metaux', 'Fer', 'Gabès', '{"ar":"قابس المدينة","fr":"Gabès Ville","en":"Gabès City"}'::jsonb, 1.2, 'kg', 8000, 'fixe', ARRAY['listing-scrap-iron']::text[], '{"name":"Ferraille Ben Salah","kind":"pro","verified":true,"memberSince":"2023","phone":"+216 74 000 000"}'::jsonb, false, false, NULL, 'approved', '2026-11-06'),
  ('jantes-alu-16-tunis', '{"ar":"4 جنط ألمنيوم 16 بوصة","fr":"4 jantes alu 16 pouces","en":"4 alloy rims, 16 inch"}'::jsonb, '{"ar":"طقم 4 جنط ألمنيوم 16 بوصة، 5x114. آثار استعمال خفيفة، بلا تشقق.","fr":"Jeu de 4 jantes aluminium 16\", entraxe 5x114. Légères traces d''usage, aucune fissure.","en":"Set of 4 aluminium 16\" rims, 5x114 bolt pattern. Light signs of use, no cracks."}'::jsonb, 'pieces-auto', 'Jantes', 'Tunis', '{"ar":"المرسى","fr":"La Marsa","en":"La Marsa"}'::jsonb, 120, 'piece', 4, 'negociable', ARRAY['listing-rims']::text[], '{"name":"Mehdi T.","kind":"particulier","verified":false,"memberSince":"2025","phone":"+216 22 000 000"}'::jsonb, false, true, NULL, 'approved', '2026-11-09'),
  ('tour-parallele-monastir', '{"ar":"مخرطة ورشة قديمة — فينتاج","fr":"Tour parallèle d''atelier — vintage","en":"Workshop lathe — vintage"}'::jsonb, '{"ar":"مخرطة متوازية قديمة، طول الشغل 1 متر، تخدم بالتيار الثلاثي. مناسبة للورشة أو للترميم.","fr":"Tour parallèle ancien, entre-pointes 1 m, fonctionne en triphasé. Idéal atelier ou restauration.","en":"Old centre lathe, 1 m between centres, runs on three-phase power. Ideal for a workshop or restoration."}'::jsonb, 'industriel', 'Machines', 'Monastir', '{"ar":"قصر هلال","fr":"Ksar Hellal","en":"Ksar Hellal"}'::jsonb, 3200, 'piece', 1, 'enchere', ARRAY['listing-lathe']::text[], '{"name":"Atelier Mécanique Hichem","kind":"pro","verified":true,"memberSince":"2024","phone":"+216 73 000 000"}'::jsonb, false, false, '{"startPrice":3200,"increment":100,"endsInHours":7.5,"bids":[{"bidder":"K","amount":3200,"minutesAgo":900},{"bidder":"M","amount":3400,"minutesAgo":300}]}'::jsonb, 'approved', '2026-11-05'),
  ('batteries-usagees-ariana', '{"ar":"بطاريات سيارات مستعملة — للرسكلة","fr":"Batteries auto usagées — pour recyclage","en":"Used car batteries — for recycling"}'::jsonb, '{"ar":"بطاريات رصاص مستعملة 60–100 أمبير، مخزنة في بلاصة مغطاة. البيع بالقطعة، والاستلام من محترف مرخّص فقط.","fr":"Batteries plomb usagées 60–100 Ah, stockées à l''abri. Vente à la pièce, enlèvement par professionnel agréé uniquement.","en":"Used lead batteries 60–100 Ah, stored under cover. Sold per piece, collection by a licensed professional only."}'::jsonb, 'pieces-auto', 'Batteries', 'Ariana', '{"ar":"رواد","fr":"Raoued","en":"Raoued"}'::jsonb, 40, 'piece', 20, 'fixe', ARRAY['listing-batteries']::text[], '{"name":"Casse Auto El Amen","kind":"entreprise","verified":true,"memberSince":"2022","phone":"+216 71 000 000"}'::jsonb, false, false, NULL, 'approved', '2026-11-08'),
  ('moto-hors-service-kairouan', '{"ar":"موبيلات خارج الخدمة — للقطع","fr":"Mobylette hors service — pour pièces","en":"Out-of-service moped — for parts"}'::jsonb, '{"ar":"موبيلات قديمة خارج الخدمة، المحرك المفكوك معاها. الشاسي في حالة باهية للترميم.","fr":"Mobylette ancienne hors service, moteur démonté inclus. Cadre en bon état pour restauration.","en":"Old out-of-service moped, removed engine included. Frame in good shape for restoration."}'::jsonb, 'vehicules', 'Motos', 'Kairouan', '{"ar":"القيروان","fr":"Kairouan","en":"Kairouan"}'::jsonb, 380, 'piece', 1, 'enchere', ARRAY['listing-moto']::text[], '{"name":"Mehdi T.","kind":"particulier","verified":false,"memberSince":"2025","phone":"+216 22 000 000"}'::jsonb, false, false, '{"startPrice":250,"increment":20,"endsInHours":52,"bids":[{"bidder":"R","amount":250,"minutesAgo":1200},{"bidder":"S","amount":300,"minutesAgo":700},{"bidder":"R","amount":340,"minutesAgo":360},{"bidder":"T","amount":380,"minutesAgo":95}]}'::jsonb, 'approved', '2026-11-07'),
  ('boite-vitesses-manuelle-bizerte', '{"ar":"علبة سرعة يدوية 5 سرعات","fr":"Boîte de vitesses manuelle 5 rapports","en":"5-speed manual gearbox"}'::jsonb, '{"ar":"علبة سرعة يدوية 5 سرعات، مفكوكة من سيارة تمشي. ضمان تركيب 15 يوم.","fr":"Boîte manuelle 5 vitesses, démontée sur véhicule roulant. Garantie de montage 15 jours.","en":"5-speed manual gearbox, removed from a running car. 15-day fitting warranty."}'::jsonb, 'pieces-auto', 'Boîtes de vitesses', 'Bizerte', '{"ar":"منزل بورقيبة","fr":"Menzel Bourguiba","en":"Menzel Bourguiba"}'::jsonb, 520, 'piece', 2, 'negociable', ARRAY['listing-gearbox']::text[], '{"name":"Atelier Mécanique Hichem","kind":"pro","verified":true,"memberSince":"2024","phone":"+216 73 000 000"}'::jsonb, false, false, NULL, 'approved', '2026-11-04'),
  ('lot-recup-nabeul', '{"ar":"دفعة مواد مسترجعة — باليتات، براميل، كوابل","fr":"Lot de récupération — palettes, fûts, câbles","en":"Salvage lot — pallets, drums, cables"}'::jsonb, '{"ar":"دفعة كاملة: 40 باليتة خشب، 12 برميل بلاستيك 200 لتر، كوابل كهربائية ووصلات نحاس أصفر.","fr":"Lot complet : 40 palettes bois, 12 fûts plastique 200 L, câbles électriques et raccords en laiton.","en":"Complete lot: 40 wooden pallets, 12 plastic 200 L drums, electrical cables and brass fittings."}'::jsonb, 'recuperation', 'Divers', 'Nabeul', '{"ar":"الحمامات","fr":"Hammamet","en":"Hammamet"}'::jsonb, 600, 'lot', 1, 'fixe', ARRAY['listing-recup']::text[], '{"name":"Recyclage Cap Bon","kind":"entreprise","verified":true,"memberSince":"2024","phone":"+216 72 000 000"}'::jsonb, false, false, NULL, 'approved', '2026-11-03'),
  ('cables-electriques-sfax', '{"ar":"كوابل كهربائية مغلفة — بقايا حضائر","fr":"Câbles électriques gainés — chutes de chantier","en":"Sheathed electrical cables — site offcuts"}'::jsonb, '{"ar":"بقايا كوابل كهربائية مغلفة (نحاس)، البيع بالطن لأصحاب الرسكلة.","fr":"Chutes de câbles électriques gainés (cuivre), vente à la tonne pour recycleurs.","en":"Offcuts of sheathed (copper) electrical cables, sold by the tonne to recyclers."}'::jsonb, 'metaux', 'Câbles électriques', 'Sfax', '{"ar":"صفاقس الجنوبية","fr":"Sfax Sud","en":"Sfax South"}'::jsonb, 9500, 'tonne', 3, 'enchere', ARRAY['listing-recup', 'listing-copper']::text[], '{"name":"Ferraille Ben Salah","kind":"pro","verified":true,"memberSince":"2023","phone":"+216 74 000 000"}'::jsonb, false, false, '{"startPrice":9500,"increment":250,"endsInHours":20,"bids":[{"bidder":"F","amount":9500,"minutesAgo":60}]}'::jsonb, 'approved', '2026-11-09')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.token_packs (tokens, price, tag, sort_order)
SELECT v.tokens, v.price, v.tag, v.sort_order
FROM (VALUES
  (10, 10::numeric, NULL::jsonb, 1),
  (30, 25::numeric, '{"ar":"الأكثر طلباً","fr":"Populaire","en":"Popular"}'::jsonb, 2),
  (80, 60::numeric, NULL::jsonb, 3),
  (200, 130::numeric, '{"ar":"أحسن سوم","fr":"Meilleur prix","en":"Best value"}'::jsonb, 4)
) AS v(tokens, price, tag, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.token_packs);

INSERT INTO public.boost_services (id, name, description, cost, icon, sort_order) VALUES
  ('remonter', '{"ar":"طلّع الإعلان للفوق","fr":"Remonter l''annonce","en":"Bump the listing"}'::jsonb, '{"ar":"إعلانك يرجع في أوّل نتائج الصنف متاعو.","fr":"Votre annonce repasse en tête des résultats de sa catégorie.","en":"Your listing goes back to the top of its category."}'::jsonb, 2, 'arrow-up', 1),
  ('urgent', '{"ar":"إعلان مستعجل","fr":"Annonce urgente","en":"Urgent listing"}'::jsonb, '{"ar":"علامة «مستعجل» تبان على البطاقة وفي صفحة الإعلان.","fr":"Badge « Urgent » visible sur la carte et dans la fiche.","en":"An “Urgent” badge on the card and the listing page."}'::jsonb, 3, 'flame', 2),
  ('premium-7j', '{"ar":"إعلان مميّز — 7 أيام","fr":"Annonce Premium — 7 jours","en":"Premium listing — 7 days"}'::jsonb, '{"ar":"بلاصة في الأولوية وإطار ذهبي في القوائم.","fr":"Position prioritaire et cadre doré dans les listes.","en":"Priority position and a gold frame in lists."}'::jsonb, 8, 'star', 3),
  ('a-la-une', '{"ar":"في الواجهة — الصفحة الرئيسية","fr":"À la une — page d''accueil","en":"Featured — home page"}'::jsonb, '{"ar":"يظهر في اختيارات الصفحة الرئيسية لمدّة 3 أيام.","fr":"Affichage dans la sélection de la page d''accueil pendant 3 jours.","en":"Shown in the home page selection for 3 days."}'::jsonb, 15, 'home', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.plans (id, name, price, features, highlight, sort_order) VALUES
  ('basique', '{"ar":"أساسي","fr":"Basique","en":"Basic"}'::jsonb, 0, '[{"ar":"5 إعلانات نشيطة","fr":"5 annonces actives","en":"5 active listings"},{"ar":"حتى 12 تصويرة في الإعلان","fr":"Photos jusqu''à 12 par annonce","en":"Up to 12 photos per listing"},{"ar":"سعر ثابت، قابل للتفاوض ومزايدات","fr":"Prix fixe, négociable et enchères","en":"Fixed, negotiable and auctions"},{"ar":"مراسلة مع المشترين","fr":"Messagerie avec les acheteurs","en":"Messaging with buyers"}]'::jsonb, false, 1),
  ('pro', '{"ar":"محترف خردة","fr":"Pro Ferrailleur","en":"Scrap Pro"}'::jsonb, 49, '[{"ar":"50 إعلان نشيط","fr":"50 annonces actives","en":"50 active listings"},{"ar":"علامة بائع محترف","fr":"Badge vendeur professionnel","en":"Professional seller badge"},{"ar":"40 نقطة هدية كل شهر","fr":"40 jetons offerts chaque mois","en":"40 free tokens every month"},{"ar":"إحصائيات المشاهدة","fr":"Statistiques de consultation","en":"View statistics"},{"ar":"تسيير المخزون لبرشا إعلانات","fr":"Gestion des stocks multi-annonces","en":"Multi-listing stock management"}]'::jsonb, true, 2),
  ('entreprise', '{"ar":"شركة","fr":"Entreprise","en":"Business"}'::jsonb, 149, '[{"ar":"إعلانات بلا حدود","fr":"Annonces illimitées","en":"Unlimited listings"},{"ar":"حانوت باسمك","fr":"Boutique à votre nom","en":"Your own branded shop"},{"ar":"150 نقطة هدية كل شهر","fr":"150 jetons offerts chaque mois","en":"150 free tokens every month"},{"ar":"برشا حسابات للخدّامة","fr":"Plusieurs comptes collaborateurs","en":"Multiple team accounts"},{"ar":"مرافقة خاصة","fr":"Accompagnement dédié","en":"Dedicated support"}]'::jsonb, false, 3)
ON CONFLICT (id) DO NOTHING;