import Link from 'next/link';
import { fmtDateTime } from '@/lib/format';
import type { EventDoc } from '@/types';

interface Props {
  event: EventDoc;
  showStatus?: boolean;
}

export function EventCard({ event, showStatus = true }: Props) {
  return (
    <Link href={`/events/${event._id}`} className="block">
      <article className="card p-5 hover:shadow-lift transition-shadow">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-xl font-bold leading-tight flex-1">{event.title}</h3>
          {showStatus && event.isAttending && (
            <span className="chip-primary shrink-0">참여중</span>
          )}
        </div>

        <div className="space-y-1.5 text-base text-muted">
          <div className="flex items-center gap-2">
            <span aria-hidden>🗓️</span>
            <span>{fmtDateTime(event.startAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span aria-hidden>📍</span>
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <span aria-hidden>👥</span>
            <span>
              {event.attendeeCount ?? 0} / {event.maxAttendees}명
              {event.isFull && <span className="ml-2 text-accent font-semibold">정원마감</span>}
            </span>
          </div>
        </div>

        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {event.tags.slice(0, 4).map((t) => (
              <span key={t} className="chip">#{t}</span>
            ))}
          </div>
        )}
      </article>
    </Link>
  );
}
