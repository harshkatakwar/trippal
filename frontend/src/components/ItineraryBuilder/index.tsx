import { MapPin, Clock, IndianRupee, Sunrise, Sun, Moon, Building } from 'lucide-react';
import type { DayPlan, Activity } from '../../types/travel';

interface ItineraryBuilderProps {
  itinerary: DayPlan[];
}

import React from 'react';

/**
 * Renders the day-by-day itinerary component.
 * Wrapped in React.memo for rendering efficiency.
 */
export const ItineraryBuilder = React.memo(function ItineraryBuilder({ itinerary }: ItineraryBuilderProps) {
  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 rounded-xl p-8" style={{ background: 'rgba(255,255,255,0.02)' }} role="status">
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
          {activity.costInr?.toLocaleString() || '0'}
        </span>
      </header>
      <p className="text-xs mb-3 leading-relaxed text-white/50">{activity.description}</p>
      
      <footer className="flex items-center gap-3 text-xs text-white/40 flex-wrap">
        {activity.durationMinutes && (
          <div className="flex items-center" aria-label={`Duration: ${activity.durationMinutes} minutes`}>
            <Clock size={11} className="mr-1" aria-hidden="true" />
            {activity.durationMinutes}m
          </div>
        )}
        {activity.location && (
          <div className="flex items-center" aria-label={`Location: ${activity.location}`}>
            <MapPin size={11} className="mr-1" aria-hidden="true" />
            <span className="truncate max-w-[140px]">{activity.location}</span>
          </div>
        )}
        {activity.rating > 0 && (
          <div className="flex items-center" aria-label={`Rating: ${activity.rating} stars`}>
            <span aria-hidden="true">⭐</span> {activity.rating}
          </div>
        )}
      </footer>
    </article>
  );

  const renderTimeSlot = (title: string, activities: Activity[], Icon: React.ElementType, gradientFrom: string, gradientTo: string) => {
    if (!activities || activities.length === 0) return null;
    return (
      <section aria-labelledby={`timeslot-${title.toLowerCase()}`}>
        <header className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }} aria-hidden="true">
            <Icon size={13} className="text-white" />
          </div>
          <h4 id={`timeslot-${title.toLowerCase()}`} className="text-xs font-bold uppercase tracking-wider text-white/50">{title}</h4>
        </header>
        <div className="grid gap-2.5">{activities.map(renderActivity)}</div>
      </section>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-5 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md" tabIndex={0} aria-label="Generated Itinerary">
      {itinerary.map((dayPlan) => (
        <article
          key={dayPlan.day}
          className="rounded-2xl border p-5 bg-white/5 border-white/10"
        >
          {/* Day Header */}
          <header className="flex justify-between items-end mb-4 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
                  Day {dayPlan.day}
                </span>
                {dayPlan.theme && (
                  <span className="text-xs font-medium text-indigo-300">{dayPlan.theme}</span>
                )}
              </div>
              <p className="text-sm text-white/40">
                {new Date(dayPlan.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="text-sm font-bold flex items-center text-indigo-300" aria-label={`Estimated daily cost: ${dayPlan.estimatedCostInr || 0} rupees`}>
              <IndianRupee size={14} className="mr-0.5" aria-hidden="true" />
              {dayPlan.estimatedCostInr?.toLocaleString() || '—'}
            </div>
          </header>

          {/* Time Slots */}
          <div className="space-y-4">
            {renderTimeSlot("Morning", dayPlan.morning, Sunrise, '#f59e0b', '#f97316')}
            {renderTimeSlot("Afternoon", dayPlan.afternoon, Sun, '#06b6d4', '#3b82f6')}
            {renderTimeSlot("Evening", dayPlan.evening, Moon, '#8b5cf6', '#6366f1')}
          </div>
          
          {/* Accommodation */}
          {dayPlan.accommodation && (
            <footer className="mt-4 pt-3 flex items-center gap-2 border-t border-white/10">
              <Building size={14} className="text-indigo-300" aria-hidden="true" />
              <span className="text-xs font-semibold text-white/60">Stay:</span>
              <span className="text-xs text-white/40">{dayPlan.accommodation}</span>
            </footer>
          )}
        </article>
      ))}
    </div>
  );
});
