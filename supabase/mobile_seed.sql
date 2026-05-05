insert into public.mobile_modules (
  id,
  slug,
  title,
  class_name,
  subject_name,
  description,
  summary_points,
  duration_minutes,
  is_published
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'sistem-pencernaan-manusia',
    'Sistem Pencernaan Manusia',
    'Kelas 8',
    'IPA',
    'Materi inti organ pencernaan, fungsi, dan gangguan umum.',
    '["Urutan organ pencernaan manusia","Fungsi enzim utama","Contoh gangguan pencernaan"]'::jsonb,
    35,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'persamaan-linear-satu-variabel',
    'Persamaan Linear Satu Variabel',
    'Kelas 7',
    'Matematika',
    'Konsep bentuk persamaan, operasi setara, dan soal cerita dasar.',
    '["Bentuk umum PLSV","Langkah isolasi variabel","Penerapan dalam soal cerita"]'::jsonb,
    40,
    true
  )
on conflict (id) do nothing;

insert into public.mobile_exams (
  id,
  module_id,
  title,
  class_name,
  subject_name,
  duration_minutes,
  question_count,
  shuffle_questions,
  shuffle_options,
  is_active
)
values
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Ujian Harian Sistem Pencernaan',
    'Kelas 8',
    'IPA',
    20,
    5,
    true,
    true,
    true
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'Kuis PLSV',
    'Kelas 7',
    'Matematika',
    15,
    4,
    true,
    true,
    true
  )
on conflict (id) do nothing;

insert into public.mobile_exam_questions (
  id,
  exam_id,
  order_no,
  question_type,
  prompt,
  options_json,
  answer_key,
  essay_key_points,
  explanation
)
values
  (
    '55555555-5555-5555-5555-555555555551',
    '33333333-3333-3333-3333-333333333333',
    1,
    'multiple_choice',
    'Organ yang berfungsi utama menyerap sari-sari makanan adalah ...',
    '[{"id":"A","text":"Lambung"},{"id":"B","text":"Usus halus"},{"id":"C","text":"Kerongkongan"},{"id":"D","text":"Mulut"}]'::jsonb,
    'B',
    '[]'::jsonb,
    'Usus halus menyerap sari-sari makanan melalui vili.'
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    '33333333-3333-3333-3333-333333333333',
    2,
    'multiple_choice',
    'Enzim ptialin terdapat pada ...',
    '[{"id":"A","text":"Air liur"},{"id":"B","text":"Empedu"},{"id":"C","text":"Usus besar"},{"id":"D","text":"Lambung"}]'::jsonb,
    'A',
    '[]'::jsonb,
    'Ptialin terdapat pada saliva untuk membantu pencernaan awal karbohidrat.'
  ),
  (
    '55555555-5555-5555-5555-555555555553',
    '33333333-3333-3333-3333-333333333333',
    3,
    'multiple_choice',
    'Gangguan akibat peningkatan asam lambung disebut ...',
    '[{"id":"A","text":"Diare"},{"id":"B","text":"Maag"},{"id":"C","text":"Sembelit"},{"id":"D","text":"Tifus"}]'::jsonb,
    'B',
    '[]'::jsonb,
    'Kondisi yang umum dikenal adalah maag atau gastritis.'
  ),
  (
    '55555555-5555-5555-5555-555555555554',
    '33333333-3333-3333-3333-333333333333',
    4,
    'essay',
    'Jelaskan peran lambung dalam proses pencernaan makanan.',
    '[]'::jsonb,
    '',
    '["Mengaduk makanan","Menggunakan asam lambung","Menggunakan enzim"]'::jsonb,
    'Jawaban minimal menjelaskan fungsi mekanik dan kimiawi lambung.'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333333',
    5,
    'multiple_choice',
    'Urutan organ pencernaan yang benar adalah ...',
    '[{"id":"A","text":"Mulut - lambung - kerongkongan - usus"},{"id":"B","text":"Mulut - kerongkongan - lambung - usus halus"},{"id":"C","text":"Kerongkongan - mulut - lambung - usus besar"},{"id":"D","text":"Lambung - mulut - kerongkongan - usus halus"}]'::jsonb,
    'B',
    '[]'::jsonb,
    'Urutan yang benar dimulai dari mulut hingga usus halus.'
  ),
  (
    '66666666-6666-6666-6666-666666666661',
    '44444444-4444-4444-4444-444444444444',
    1,
    'multiple_choice',
    'Nilai x dari x + 7 = 12 adalah ...',
    '[{"id":"A","text":"3"},{"id":"B","text":"4"},{"id":"C","text":"5"},{"id":"D","text":"6"}]'::jsonb,
    'C',
    '[]'::jsonb,
    'Kurangi kedua sisi dengan 7.'
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '44444444-4444-4444-4444-444444444444',
    2,
    'multiple_choice',
    'Bentuk persamaan linear satu variabel memiliki ...',
    '[{"id":"A","text":"Dua variabel"},{"id":"B","text":"Satu variabel berpangkat satu"},{"id":"C","text":"Tiga konstanta wajib"},{"id":"D","text":"Pangkat dua"}]'::jsonb,
    'B',
    '[]'::jsonb,
    'PLSV memiliki satu variabel dengan pangkat tertinggi satu.'
  ),
  (
    '66666666-6666-6666-6666-666666666663',
    '44444444-4444-4444-4444-444444444444',
    3,
    'essay',
    'Tuliskan langkah menyelesaikan 2x - 4 = 10.',
    '[]'::jsonb,
    '',
    '["Tambah 4 pada kedua sisi","Peroleh 2x = 14","Bagi 2 sehingga x = 7"]'::jsonb,
    'Penilaian fokus pada langkah aljabar yang runtut.'
  ),
  (
    '66666666-6666-6666-6666-666666666664',
    '44444444-4444-4444-4444-444444444444',
    4,
    'multiple_choice',
    'Nilai x dari 3x = 21 adalah ...',
    '[{"id":"A","text":"5"},{"id":"B","text":"6"},{"id":"C","text":"7"},{"id":"D","text":"8"}]'::jsonb,
    'C',
    '[]'::jsonb,
    'Bagi kedua sisi dengan 3.'
  )
on conflict (id) do nothing;
