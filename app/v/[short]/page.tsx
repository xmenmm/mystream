import { redirect } from 'next/navigation';

// Short URL: /v/<short> → redirect to /watch?id=v_<short>
// Format: shortIdOf() replaces v_ prefix and converts _ to -, ini balikan-nya.
export default function VShortPage({ params }: { params: { short: string } }) {
  const short = params.short || '';
  // Balik: ganti '-' jadi '_', tambah prefix v_
  const id = 'v_' + short.replace(/-/g, '_');
  redirect('/watch?id=' + encodeURIComponent(id));
}
