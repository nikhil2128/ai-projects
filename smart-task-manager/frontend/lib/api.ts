
export async function api(url: string) {
  const res = await fetch('http://localhost:3000' + url);
  return res.json();
}
