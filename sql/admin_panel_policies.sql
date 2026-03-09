-- =============================================
-- ადმინის პანელისთვის: მომხმარებლების სიის ნახვა (view)
-- =============================================

-- ადმინს უნდა ხედავდეს სხვა მომხმარებლების ძირითად ინფოს
-- auth.users-ზე პირდაპირ წვდომა არ არის, ამიტომ profiles + user_roles-ს ვიყენებთ

-- ადმინებს შეუძლიათ ყველა პროფილის ნახვა
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

-- ადმინებს შეუძლიათ ყველა user_roles-ის ნახვა (არსებული policy მხოლოდ საკუთარს აჩვენებს)
CREATE POLICY "Admins can view all user roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );
