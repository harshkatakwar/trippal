import React, { useState, useCallback } from 'react';
import { MapPin, Clock, IndianRupee, Sunrise, Sun, Moon, Building, Copy, Check } from 'lucide-react';
import type { DayPlan, Activity, WeatherInfo } from '../../types/travel';

interface ItineraryBuilderProps {
  itinerary: DayPlan[];
  previousItinerary?: DayPlan[];
}

// ── Weather helpers ────────────────────────────────────────────────────────

function weatherEmoji(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return '🌧️';
  if (c.includes('storm') || c.includes('thunder')) return '⛈️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return '🌫️';
  if (c.includes('cloud') || c.includes('overcast')) return '⛅';
  if (c.includes('sun') || c.includes('clear')) return '☀️';
  return '🌤️';
}

function weatherTip(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return 'Carry an umbrella';
  if (c.includes('storm')) return 'Stay indoors if possible';
  return '';
}

function WeatherBadge({ weather }: { weather: WeatherInfo }) {
  const tip = weatherTip(weather.condition);
  return (
    <span className="flex items-center gap-1 text-xs text-white/50">
      <span aria-hidden="true">{weatherEmoji(weather.condition)}</span>
      <span>{weather.temperatureCelsius}°C</span>
      {weather.humidity && <span className="text-white/30">· {weather.humidity} humidity</span>}
      {tip && <span className="text-orange-300/70">· {tip}</span>}
    </span>
  );
}

// ── Budget breakdown ───────────────────────────────────────────────────────

function BudgetBreakdown({ itinerary }: { itinerary: DayPlan[] }) {
  const activities = itinerary.flatMap(d => [...d.morning, ...d.afternoon, ...d.evening]);
  const isTransit = (a: Activity) =>
    ['transit', 'transport', 'travel', 'flight', 'train', 'bus'].some(k => a.category.toLowerCase().includes(k));

  const transitCost = activities.filter(isTransit).reduce((s, a) => s + (a.costInr || 0), 0);
  const activitiesCost = activities.filter(a => !isTransit(a)).reduce((s, a) => s + (a.costInr || 0), 0);
  const stayCost = itinerary.reduce((s, d) => s + (d.accommodationCostInr || 0), 0);
  const total = activitiesCost + stayCost + transitCost;

  if (total === 0) return null;

  const bars = [
    { label: 'Activities', cost: activitiesCost, color: '#6366f1' },
    { label: 'Stay',       cost: stayCost,        color: '#8b5cf6' },
    { label: 'Transit',    cost: transitCost,      color: '#a78bfa' },
  ].filter(b => b.cost > 0);

  return (
    <div
      className="mb-4 p-3 rounded-xl border"
      style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
    >
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-xs font-bold text-white/70">Budget Breakdown</span>
        <span className="text-xs font-bold text-indigo-300">
          Total ₹{total.toLocaleString('en-IN')}
        </span>
      </div>
      <div className="space-y-1.5">
        {bars.map(bar => (
          <div key={bar.label} className="flex items-center gap-2">
            <span className="text-[11px] text-white/50 w-16 flex-shrink-0">{bar.label}</span>
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.1)' }}
              role="progressbar"
              aria-valuenow={bar.cost}
              aria-valuemax={total}
              aria-label={`${bar.label}: ₹${bar.cost.toLocaleString('en-IN')}`}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(bar.cost / total) * 100}%`, background: bar.color }}
              />
            </div>
            <span className="text-[11px] font-medium text-white/60 w-16 text-right flex-shrink-0">
              ₹{bar.cost.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Diff view ─────────────────────────────────────────────────────────────

function DiffView({ current, previous }: { current: DayPlan; previous?: DayPlan }) {
  if (!previous) return null;

  const diffs: { label: string; old: string; new: string; delta: number }[] = [];

  if (current.accommodation !== previous.accommodation) {
    diffs.push({
      label: 'Stay',
      old: `${previous.accommodation}${previous.accommodationCostInr ? ` · ₹${previous.accommodationCostInr.toLocaleString('en-IN')}` : ''}`,
      new: `${current.accommodation}${current.accommodationCostInr ? ` · ₹${current.accommodationCostInr.toLocaleString('en-IN')}` : ''}`,
      delta: (previous.accommodationCostInr || 0) - (current.accommodationCostInr || 0),
    });
  }

  if (current.estimatedCostInr !== previous.estimatedCostInr) {
    diffs.push({
      label: 'Day total',
      old: `₹${previous.estimatedCostInr.toLocaleString('en-IN')}`,
      new: `₹${current.estimatedCostInr.toLocaleString('en-IN')}`,
      delta: previous.estimatedCostInr - current.estimatedCostInr,
    });
  }

  if (diffs.length === 0) return null;

  return (
    <div
      className="mb-3 p-2.5 rounded-lg border space-y-1.5"
      style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.2)' }}
    >
      <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Changes</p>
      {diffs.map(diff => (
        <div key={diff.label} className="text-[11px] leading-snug">
          <span className="text-white/40">{diff.label}: </span>
          <span className="line-through text-red-400/70">❌ {diff.old}</span>
          <span className="text-white/30"> → </span>
          <span className="text-green-400/80">✅ {diff.new}</span>
          {diff.delta > 0 && (
            <span className="ml-1.5 font-bold text-green-400">
              Saved ₹{diff.delta.toLocaleString('en-IN')}
            </span>
          )}
          {diff.delta < 0 && (
            <span className="ml-1.5 font-bold text-orange-400">
              +₹{Math.abs(diff.delta).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export const ItineraryBuilder = React.memo(function ItineraryBuilder({
  itinerary,
  previousItinerary,
}: ItineraryBuilderProps) {
  const [activeDay, setActiveDay] = useState<number | 'all'>('all');
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const total = itinerary.reduce((s, d) => s + d.estimatedCostInr, 0);
    const header = `✈️ *TripPal Itinerary*\n📅 ${itinerary[0]?.date ?? ''} → ${itinerary.at(-1)?.date ?? ''}\n💰 Total: ₹${total.toLocaleString('en-IN')}\n\n`;
    const body = itinerary
      .map(day => {
        const acts = [...day.morning, ...day.afternoon, ...day.evening];
        return (
          `*Day ${day.day} — ${day.theme}*\n` +
          acts.map(a => `• ${a.name} (₹${a.costInr.toLocaleString('en-IN')})`).join('\n') +
          `\n🏨 ${day.accommodation}\n💰 ₹${day.estimatedCostInr.toLocaleString('en-IN')}`
        );
      })
      .join('\n\n');

    navigator.clipboard.writeText(header + body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [itinerary]);

  if (!itinerary || itinerary.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-xl p-8"
        style={{ background: 'rgba(255,255,255,0.02)' }}
        role="status"
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-indigo-500/15" aria-hidden="true">
          <MapPin size={28} className="text-indigo-400" />
        </div>
        <div className="text-center">
          <p className="font-semibold mb-1 text-white/70">No itinerary yet</p>
          <p className="text-sm text-white/40">Chat with TripPal to plan your perfect trip!</p>
        </div>
      </div>
    );
  }

  const visibleDays = activeDay === 'all' ? itinerary : itinerary.filter(d => d.day === activeDay);

  const renderActivity = (activity: Activity) => (
    <article
      key={activity.placeId || activity.name}
      className="rounded-xl p-3.5 transition-all duration-200 border bg-white/5 border-white/10"
      tabIndex={0}
    >
      <header className="flex justify-between items-start mb-2">
        <h5 className="font-semibold text-sm text-white/90">{activity.name}</h5>
        <span
          className="flex items-center text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 bg-indigo-500/20 text-indigo-300"
          aria-label={`Cost: ${activity.costInr || 0} rupees`}
        >
          <IndianRupee size={10} className="mr-0.5" aria-hidden="true" />
          {(activity.costInr ?? 0).toLocaleString('en-IN')}
        </span>
      </header>
      <p className="text-xs mb-3 leading-relaxed text-white/50">{activity.description}</p>
      <footer className="flex items-center gap-3 text-xs text-white/40 flex-wrap">
        {activity.durationMinutes > 0 && (
          <span className="flex items-center" aria-label={`Duration: ${activity.durationMinutes} minutes`}>
            <Clock size={11} className="mr-1" aria-hidden="true" />
            {activity.durationMinutes}m
          </span>
        )}
        {activity.location && (
          <span className="flex items-center" aria-label={`Location: ${activity.location}`}>
            <MapPin size={11} className="mr-1" aria-hidden="true" />
            <span className="truncate max-w-[140px]">{activity.location}</span>
          </span>
        )}
        {activity.rating > 0 && (
          <span aria-label={`Rating: ${activity.rating} out of 5`}>
            <span aria-hidden="true">⭐</span> {activity.rating}
          </span>
        )}
      </footer>
    </article>
  );

  const renderTimeSlot = (
    title: string,
    activities: Activity[],
    Icon: React.ElementType,
    gradFrom: string,
    gradTo: string,
  ) => {
    if (!activities || activities.length === 0) return null;
    const slotId = `timeslot-${title.toLowerCase()}`;
    return (
      <section aria-labelledby={slotId}>
        <header className="flex items-center gap-2 mb-2.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
            aria-hidden="true"
          >
            <Icon size={13} className="text-white" />
          </div>
          <h4 id={slotId} className="text-xs font-bold uppercase tracking-wider text-white/50">
            {title}
          </h4>
        </header>
        <div className="grid gap-2.5">{activities.map(renderActivity)}</div>
      </section>
    );
  };

  return (
    <div
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
      tabIndex={0}
      aria-label="Generated Itinerary"
    >
      {/* Budget breakdown */}
      <BudgetBreakdown itinerary={itinerary} />

      {/* Day tabs + copy button */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <button
          onClick={() => setActiveDay('all')}
          className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            activeDay === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white/10 text-white/50 hover:bg-white/15'
          }`}
        >
          All
        </button>
        {itinerary.map(day => (
          <button
            key={day.day}
            onClick={() => setActiveDay(day.day)}
            aria-label={`View Day ${day.day}`}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              activeDay === day.day
                ? 'bg-indigo-600 text-white'
                : 'bg-white/10 text-white/50 hover:bg-white/15'
            }`}
          >
            Day {day.day}
          </button>
        ))}
        <button
          onClick={handleCopy}
          aria-label="Copy itinerary for WhatsApp"
          className="ml-auto flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-white/50 hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* Day cards */}
      <div className="space-y-5">
        {visibleDays.map(dayPlan => {
          const prevDay = previousItinerary?.find(d => d.day === dayPlan.day);
          return (
            <article
              key={dayPlan.day}
              className="rounded-2xl border p-5 bg-white/5 border-white/10"
            >
              {/* Day header */}
              <header className="flex justify-between items-start mb-4 pb-3 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
                      Day {dayPlan.day}
                    </span>
                    {dayPlan.theme && (
                      <span className="text-xs font-medium text-indigo-300">{dayPlan.theme}</span>
                    )}
                  </div>
                  {dayPlan.date && (
                    <p className="text-[11px] text-white/30">
                      {new Date(dayPlan.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  )}
                  {dayPlan.weather && (
                    <div className="mt-1">
                      <WeatherBadge weather={dayPlan.weather} />
                    </div>
                  )}
                </div>
                <span
                  className="text-sm font-bold flex items-center text-indigo-300 flex-shrink-0 ml-2"
                  aria-label={`Estimated daily cost: ${dayPlan.estimatedCostInr} rupees`}
                >
                  <IndianRupee size={13} className="mr-0.5" aria-hidden="true" />
                  {dayPlan.estimatedCostInr.toLocaleString('en-IN')}
                </span>
              </header>

              {/* Diff view (only on modified itineraries) */}
              <DiffView current={dayPlan} previous={prevDay} />

              {/* Time slots */}
              <div className="space-y-4">
                {renderTimeSlot('Morning',   dayPlan.morning,   Sunrise, '#f59e0b', '#f97316')}
                {renderTimeSlot('Afternoon', dayPlan.afternoon, Sun,    '#06b6d4', '#3b82f6')}
                {renderTimeSlot('Evening',   dayPlan.evening,   Moon,   '#8b5cf6', '#6366f1')}
              </div>

              {/* Accommodation */}
              {dayPlan.accommodation && dayPlan.accommodation !== 'In your comfort zone' && (
                <footer className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building size={13} className="text-indigo-300" aria-hidden="true" />
                    <span className="text-xs font-semibold text-white/60">Stay:</span>
                    <span className="text-xs text-white/40">{dayPlan.accommodation}</span>
                  </div>
                  {(dayPlan.accommodationCostInr ?? 0) > 0 && (
                    <span className="text-xs font-bold text-indigo-300">
                      ₹{(dayPlan.accommodationCostInr ?? 0).toLocaleString('en-IN')}/night
                    </span>
                  )}
                </footer>
              )}

              {/* Transit notes */}
              {dayPlan.transitNotes && (
                <p className="mt-2 text-[11px] text-white/30 italic">{dayPlan.transitNotes}</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
});
