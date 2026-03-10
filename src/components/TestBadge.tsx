import React from 'react';
type S = 'passing' | 'failing' | 'not_covered';
const cfg: Record<S, { label: string; bg: string; color: string }> = {
  passing:     { label: '✅ Passing',      bg: '#d4edda', color: '#155724' },
  failing:     { label: '❌ Failing',      bg: '#f8d7da', color: '#721c24' },
  not_covered: { label: '⚠️ Not covered',  bg: '#fff3cd', color: '#856404' },
};
export default function TestBadge({ status }: { status: S }) {
  const { label, bg, color } = cfg[status] ?? cfg.not_covered;
  return <span style={{ display:'inline-block', padding:'.15rem .6rem', borderRadius:999, fontSize:'.8rem', fontWeight:500, background:bg, color }}>{label}</span>;
}
