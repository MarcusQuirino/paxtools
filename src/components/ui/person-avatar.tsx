/**
 * Round avatar: photo or initials on a tint picked from the id (stable per
 * person), 2px ink border. `AvatarStack` overlaps a few with a "+N".
 */
import { avatarInitials } from "@/lib/escoteiro-context";

const AVATAR_TINTS = ["#F4C430", "#FBE3EC", "#DFF2E0", "#E3E8F8", "#FCE4E4"];

export function avatarTint(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length]!;
}

export function PersonAvatar({
  id,
  name,
  email,
  image,
  size = 36,
  tint,
  className,
}: {
  id: string;
  name: string | null | undefined;
  email?: string | null;
  image?: string | null;
  size?: number;
  /** Override the hashed tint (e.g. gold for the viewer). */
  tint?: string;
  className?: string;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[#141414] font-black text-[#141414] ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        background: tint ?? avatarTint(id),
        fontSize: Math.max(10, Math.round(size * 0.36)),
      }}
      aria-hidden
    >
      {image ? (
        <img src={image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        avatarInitials(name, email)
      )}
    </span>
  );
}

export function AvatarStack({
  people,
  total,
}: {
  people: { _id: string; name: string | null; image: string | null }[];
  total: number;
}) {
  const extra = total - people.length;
  return (
    <span className="inline-flex items-center" aria-hidden>
      {people.map((p, i) => (
        <span key={p._id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <PersonAvatar id={p._id} name={p.name} image={p.image} size={26} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="grid size-[26px] place-items-center rounded-full border-2 border-[#141414] bg-white text-[10px] font-black"
          style={{ marginLeft: -8 }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
