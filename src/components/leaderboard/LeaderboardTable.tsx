'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatScore } from '@/lib/format';
import type { LeaderboardEntry } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/animated-table-rows';

const RANK_STYLES: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-zinc-300',
  3: 'text-orange-400',
};

const RANK_LABELS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export function LeaderboardTable({
  entries,
  highlightUserId,
}: {
  entries: LeaderboardEntry[];
  highlightUserId?: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-border/40 bg-transparent p-8 text-center text-muted-foreground">
        No scores recorded yet.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-border/40 overflow-hidden backdrop-blur-sm bg-card/10">
      <Table>
        <TableHeader>
          <TableRow className="border-border/40 hover:bg-transparent">
            <TableHead className="w-16 text-center">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {entries.map((entry, index) => {
              const isMe = entry.user.id === highlightUserId;
              return (
                <motion.tr
                  key={`${entry.gameId}-${entry.user.id}-${entry.rank}`}
                  layout
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -80 }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  className={cn(
                    'border-b border-border/40 transition-colors hover:bg-muted/20',
                    isMe && 'bg-primary/10 hover:bg-primary/15',
                  )}
                >
                  {/* Rank */}
                  <TableCell className="w-16 text-center">
                    {RANK_LABELS[entry.rank] ? (
                      <span className="text-xl">{RANK_LABELS[entry.rank]}</span>
                    ) : (
                      <span
                        className={cn(
                          'text-base font-black tabular-nums',
                          RANK_STYLES[entry.rank] ?? 'text-muted-foreground',
                        )}
                      >
                        {entry.rank}
                      </span>
                    )}
                  </TableCell>

                  {/* Player */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar user={entry.user} size="sm" />
                      <span className="font-semibold text-foreground truncate">
                        {entry.user.displayName}
                        {isMe && (
                          <span className="ml-2 text-xs font-normal text-primary">
                            (you)
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>

                  {/* Score */}
                  <TableCell className="text-right">
                    <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                      {formatScore(entry.score)}
                    </span>
                  </TableCell>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}
