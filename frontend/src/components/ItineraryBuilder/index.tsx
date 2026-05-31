
import { MapPin, Clock, IndianRupee, Sunrise, Sun, Moon, Building } from 'lucide-react';
import type { DayPlan, Activity } from '../../types/travel';

interface ItineraryBuilderProps {
  itinerary: DayPlan[];
}

export function ItineraryBuilder({ itinerary }: ItineraryBuilderProps) {
  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 rounded-xl p-8" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(79,70,229,0.15)' }}>
          <MapPin size={28} style={{ color: '#818cf8' }} />
        </div>
        <div className="text-center">
          <p className="font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>No itinerary yet</p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Chat with TripPal to plan your perfect trip!</p>
        </div>
      </div>
    );
  }

  const renderActivity = (activity: Activity) => (
    <div
      key={activity.placeId || activity.name}
      className="rounded-xl p-3.5 transition-all duration-200 border"
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>{activity.name}</h4>
        <span
          className="flex items-center text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
          style={{ background: 'rgba(79,70,229,0.2)', color: '#a5b4fc' }}
        >
          <IndianRupee size={10} className="mr-0.5" />
          {activity.costInr?.toLocaleString() || '0'}
        </span>
      </div>
      <p className="text-xs mb-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{activity.description}</p>
      
      <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {activity.durationMinutes && (
          <div className="flex items-center">
            <Clock size={11} className="mr-1" />
            {activity.durationMinutes}m
          </div>
        )}
        {activity.location && (
          <div className="flex items-center">
            <MapPin size={11} className="mr-1" />
            <span className="truncate max-w-[140px]">{activity.location}</span>
          </div>
        )}
        {activity.rating > 0 && (
          <div className="flex items-center">
            ⭐ {activity.rating}
          </div>
        )}
      </div>
    </div>
  );

  const renderTimeSlot = (title: string, activities: Activity[], Icon: any, gradientFrom: string, gradientTo: string) => {
    if (!activities || activities.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}>
            <Icon size={13} className="text-white" />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>{title}</h4>
        </div>
        <div className="grid gap-2.5">{activities.map(renderActivity)}</div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-5 pr-1">
      {itinerary.map((dayPlan) => (
        <div
          key={dayPlan.day}
          className="rounded-2xl border p-5"
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          {/* Day Header */}
          <div className="flex justify-between items-end mb-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white' }}>
                  Day {dayPlan.day}
                </span>
                {dayPlan.theme && (
                  <span className="text-xs font-medium" style={{ color: '#a5b4fc' }}>{dayPlan.theme}</span>
                )}
              </div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {new Date(dayPlan.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="text-sm font-bold flex items-center" style={{ color: '#a5b4fc' }}>
              <IndianRupee size={14} className="mr-0.5" />
              {dayPlan.estimatedCostInr?.toLocaleString() || '—'}
            </div>
          </div>

          {/* Time Slots */}
          <div className="space-y-4">
            {renderTimeSlot("Morning", dayPlan.morning, Sunrise, '#f59e0b', '#f97316')}
            {renderTimeSlot("Afternoon", dayPlan.afternoon, Sun, '#06b6d4', '#3b82f6')}
            {renderTimeSlot("Evening", dayPlan.evening, Moon, '#8b5cf6', '#6366f1')}
          </div>
          
          {/* Accommodation */}
          {dayPlan.accommodation && (
            <div className="mt-4 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Building size={14} style={{ color: '#a5b4fc' }} />
              <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Stay:</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{dayPlan.accommodation}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
