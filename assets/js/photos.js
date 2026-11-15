// Illustrative stock photography (Pexels licence: free to use, no attribution required;
// we credit photographers anyway). These photos do NOT show HUMORA FOUNDATION's own work:
// every one is rendered with an "Illustrative photo" label. Verified activity photos
// uploaded by admins are shown without that label.
export const PHOTOS = {
  hero:      { id: 9823013,  credit: 'Lagos Food Bank Initiative', en: 'Smiling children holding food packages at a community distribution', bn: 'খাদ্যসামগ্রী হাতে হাসিমুখ শিশুরা' },
  about:     { id: 6646900,  credit: 'RDNE Stock project', en: 'Two smiling volunteers carrying boxes of food and medicine', bn: 'খাদ্য ও ওষুধের বাক্স হাতে দুই হাসিমুখ স্বেচ্ছাসেবক' },
  families:  { id: 6646882,  credit: 'RDNE Stock project', en: 'Volunteers handing over a box of food aid', bn: 'স্বেচ্ছাসেবকেরা খাদ্য সহায়তার বাক্স তুলে দিচ্ছেন' },
  street:    { id: 14108494, credit: 'Abhay Pratap', en: 'A group of smiling children outdoors', bn: 'বাইরে একদল হাসিমুখ শিশু' },
  emergency: { id: 6647178,  credit: 'RDNE Stock project', en: 'Volunteers distributing relief boxes outdoors', bn: 'স্বেচ্ছাসেবকেরা বাইরে ত্রাণের বাক্স বিতরণ করছেন' },
  food:      { id: 6895226,  credit: 'Pexels', en: 'A volunteer handing out meals to children', bn: 'একজন স্বেচ্ছাসেবক শিশুদের হাতে খাবার তুলে দিচ্ছেন' },
  clothing:  { id: 6994831,  credit: 'Julia M Cameron', en: 'Volunteers smiling while sorting donated clothes', bn: 'হাসিমুখে দান করা কাপড় গোছাচ্ছেন স্বেচ্ছাসেবকেরা' },
  children:  { id: 2385657,  credit: 'Nishant Aneja', en: 'Three smiling children outdoors', bn: 'বাইরে তিনটি হাসিমুখ শিশু' },
  medical:   { id: 7653108,  credit: 'Pexels', en: 'A doctor gently examining a smiling girl', bn: 'একজন চিকিৎসক হাসিমুখ এক শিশুকে যত্ন করে দেখছেন' },
  winter:    { id: 6995047,  credit: 'Julia M Cameron', en: 'Volunteers packing warm clothes for donation', bn: 'দানের জন্য গরম কাপড় প্যাক করছেন স্বেচ্ছাসেবকেরা' },
  education: { id: 15119089, credit: 'Pallav Suthar', en: 'Children learning together in a rural classroom', bn: 'গ্রামের শ্রেণিকক্ষে একসঙ্গে পড়াশোনা করছে শিশুরা' },
  elderly:   { id: 6646989,  credit: 'RDNE Stock project', en: 'A volunteer offering a drink to an elderly man', bn: 'একজন স্বেচ্ছাসেবক বয়স্ক এক ব্যক্তিকে পানীয় দিচ্ছেন' },
  donate:    { id: 9090750,  credit: 'Lagos Food Bank Initiative', en: 'A joyful child receiving food supplies from a volunteer', bn: 'স্বেচ্ছাসেবকের কাছ থেকে খাদ্যসামগ্রী পেয়ে আনন্দিত শিশু' }
};

const base = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;
// Pexels' image CDN resizes and compresses on the fly (WebP/AVIF where supported).
export const photoUrl = (id, w, h) => `${base(id)}?auto=compress&cs=tinysrgb&fit=crop&w=${w}${h ? `&h=${h}` : ''}`;
export function photoSrcset(id, ratio) {
  return [480, 768, 1080, 1600, 2000].map((w) => `${photoUrl(id, w, ratio ? Math.round(w / ratio) : 0)} ${w}w`).join(', ');
}
