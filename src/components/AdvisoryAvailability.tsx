import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Video, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Globe, 
  X, 
  GitBranch, 
  Copy,
  Check,
  CalendarCheck
} from 'lucide-react';
import { ARCHITECTS, ArchitectProfile } from './AdvisoryTeam';
import { useAuth } from '../contexts/AuthContext';

export interface BookingRecord {
  id: string;
  architectId: string;
  architectName: string;
  date: string;
  timeSlot: string;
  timezone: string;
  orgName: string;
  attendeeEmail: string;
  topic: string;
  notes?: string;
  repoUrl?: string;
  meetingUrl: string;
  bookedAt: string;
}

interface AdvisoryAvailabilityProps {
  onShowToast?: (message: string) => void;
  defaultOrg?: string;
  defaultRepo?: string;
}

const TIMEZONES = [
  { id: 'America/New_York', label: 'US Eastern (UTC-5)' },
  { id: 'America/Chicago', label: 'US Central (UTC-6)' },
  { id: 'America/Denver', label: 'US Mountain (UTC-7)' },
  { id: 'America/Los_Angeles', label: 'US Pacific (UTC-8)' },
  { id: 'UTC', label: 'Universal (UTC+0)' },
  { id: 'Europe/London', label: 'London / GMT (UTC+0)' },
  { id: 'Europe/Berlin', label: 'Central European (UTC+1)' },
  { id: 'Asia/Singapore', label: 'Singapore (UTC+8)' }
];

const TOPIC_PRESETS = [
  'OPA Rego Policy Review & KMS Key Shredding Invariants',
  'Decoupled Data Mesh Topology & Event Replay Audit',
  'Sub-15m RTO Multi-Region Disaster Recovery Drill',
  'Terraform / OpenTofu Multi-Cloud Module Inspection',
  'Schedule A Technical Intake & RFC Co-Authoring'
];

export const AdvisoryAvailability: React.FC<AdvisoryAvailabilityProps> = ({
  onShowToast,
  defaultOrg = 'Apex FinTech Systems',
  defaultRepo = 'https://github.com/apex-fintech/core-mesh'
}) => {
  const [selectedArchitectId, setSelectedArchitectId] = useState<string>('all');
  const [selectedTimezone, setSelectedTimezone] = useState<string>('America/New_York');
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week, 1 = next week, etc.
  const [bookings, setBookings] = useState<BookingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('archtechnix_advisory_bookings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal / Booking Sheet state
  const [activeSlot, setActiveSlot] = useState<{
    date: string;
    formattedDate: string;
    timeSlot: string;
    architect: ArchitectProfile;
  } | null>(null);

  const [bookingOrg, setBookingOrg] = useState<string>(defaultOrg);
  const [bookingEmail, setBookingEmail] = useState<string>('cto@apexfintech.io');
  const [bookingTopic, setBookingTopic] = useState<string>(TOPIC_PRESETS[0]);
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [bookingRepo, setBookingRepo] = useState<string>(defaultRepo);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const { user, idToken, signInWithGoogle } = useAuth();

  // Sync bookings to localStorage & hydrate from Cloud SQL on mount
  useEffect(() => {
    try {
      localStorage.setItem('archtechnix_advisory_bookings', JSON.stringify(bookings));
    } catch (e) {
      console.warn('Booking persistence error:', e);
    }
  }, [bookings]);

  useEffect(() => {
    fetch('/api/advisory/slots')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.bookings) && data.bookings.length > 0) {
          setBookings(data.bookings);
        }
      })
      .catch(() => {});
  }, []);

  // Compute weekdays for the currently selected week offset
  const getWeekDays = () => {
    const today = new Date();
    // Anchor to Monday of the target week
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
    const distanceToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday + weekOffset * 7);

    const days = [];
    for (let i = 0; i < 5; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();

  // 1-hour time slots offered across day
  const STANDARD_HOURS = [
    { label: '09:00 AM - 10:00 AM', slotKey: '0900' },
    { label: '11:00 AM - 12:00 PM', slotKey: '1100' },
    { label: '02:00 PM - 03:00 PM', slotKey: '1400' },
    { label: '04:00 PM - 05:00 PM', slotKey: '1600' }
  ];

  const handleOpenBooking = (date: Date, timeSlot: string, architect: ArchitectProfile) => {
    const dateStr = date.toISOString().split('T')[0];
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    setActiveSlot({
      date: dateStr,
      formattedDate,
      timeSlot,
      architect
    });
    setConfirmedBooking(null);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSlot) return;

    setIsSubmitting(true);
    try {
      let token = idToken;
      if (!user || !token) {
        await signInWithGoogle();
        const { auth } = await import('../lib/firebase');
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
      }

      if (!token) {
        if (onShowToast) {
          onShowToast('Google Sign-In is required to persist your 1-Hour Sync Booking.');
        }
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/advisory/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          architectId: activeSlot.architect.id,
          architectName: activeSlot.architect.name,
          date: activeSlot.date,
          timeSlot: activeSlot.timeSlot,
          timezone: selectedTimezone,
          orgName: bookingOrg,
          attendeeEmail: bookingEmail,
          topic: bookingTopic,
          notes: bookingNotes,
          repoUrl: bookingRepo
        })
      });

      const data = await response.json();
      if (response.ok && data.success && data.booking) {
        const newRecord: BookingRecord = data.booking;
        setBookings((prev) => [newRecord, ...prev]);
        setConfirmedBooking(newRecord);
        if (onShowToast) {
          onShowToast(`1-Hour Advisory Sync persisted to Cloud SQL with ${activeSlot.architect.name}!`);
        }
      } else {
        throw new Error(data.error || 'Failed to save booking');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(err?.message || 'Booking was cancelled or failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadIcs = (booking: BookingRecord) => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Archtechnix//Advisory Sync//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${booking.id}@archtechnix.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:Archtechnix Advisory 1-Hour Sync: ${booking.topic}
DESCRIPTION:Principal Architect: ${booking.architectName}\\nOrganization: ${booking.orgName}\\nAgenda: ${booking.topic}\\nMeeting Link: ${booking.meetingUrl}\\nRepository: ${booking.repoUrl || 'N/A'}
LOCATION:${booking.meetingUrl}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Archtechnix_Sync_${booking.date}_${booking.architectId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('Calendar event (.ics) downloaded!');
  };

  const handleCopyMeetingLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      if (onShowToast) onShowToast('Meeting link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // Helper to check if slot is booked
  const isSlotBooked = (dateStr: string, timeSlot: string, architectId: string) => {
    return bookings.some(
      (b) => b.date === dateStr && b.timeSlot === timeSlot && b.architectId === architectId
    );
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
      {/* Top Header & Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1.5 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Weekly 1-Hour Synchronized Alignment Calendar</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Advisory Availability & Sync Booking
          </h3>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Directly reserve your weekly 1-hour alignment window with Archtechnix principal architects. Deep-dive into OPA Rego invariants, decoupled event meshes, and multi-region failover blueprints.
          </p>
        </div>

        {/* Global Controls: Timezone & Week Offset */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timezone Selector */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs font-mono text-slate-300">
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.id} value={tz.id} className="bg-slate-900 text-slate-200">
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
              disabled={weekOffset === 0}
              className={`p-1.5 rounded-lg transition-colors ${
                weekOffset === 0 
                  ? 'text-slate-600 cursor-not-allowed' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-2 text-slate-300 font-bold whitespace-nowrap">
              {weekOffset === 0 ? 'Current Week' : `Week +${weekOffset}`}
            </span>
            <button
              onClick={() => setWeekOffset((prev) => Math.min(3, prev + 1))}
              disabled={weekOffset === 3}
              className={`p-1.5 rounded-lg transition-colors ${
                weekOffset === 3 
                  ? 'text-slate-600 cursor-not-allowed' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Architect Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-6 pb-4">
        <span className="text-xs font-mono text-slate-400 mr-2 uppercase tracking-wider">
          Filter Architect:
        </span>
        <button
          onClick={() => setSelectedArchitectId('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
            selectedArchitectId === 'all'
              ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
              : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
          }`}
        >
          All Principal Architects ({ARCHITECTS.length})
        </button>
        {ARCHITECTS.map((arch) => (
          <button
            key={arch.id}
            onClick={() => setSelectedArchitectId(arch.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center space-x-2 transition-all ${
              selectedArchitectId === arch.id
                ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${arch.avatarGradient}`} />
            <span>{arch.name}</span>
            <span className="text-[10px] text-slate-400 font-sans opacity-80">
              ({arch.focusArea === 'data-mesh' ? 'Mesh' : arch.focusArea === 'opa-rego' ? 'Rego' : 'IaC'})
            </span>
          </button>
        ))}
      </div>

      {/* Calendar Grid: 5 Weekdays */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
        {weekDays.map((day, dayIndex) => {
          const dateStr = day.toISOString().split('T')[0];
          const isToday = new Date().toISOString().split('T')[0] === dateStr;
          const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return (
            <div
              key={dateStr}
              className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                isToday 
                  ? 'bg-slate-950/90 border-cyan-500/40 shadow-lg shadow-cyan-950/20' 
                  : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700/80'
              }`}
            >
              {/* Day Header */}
              <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono uppercase text-slate-400 font-bold">
                    {dayName}
                  </div>
                  <div className="text-sm font-extrabold text-white mt-0.5">
                    {dayNum}
                  </div>
                </div>
                {isToday && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Today
                  </span>
                )}
              </div>

              {/* Time Slots for this day */}
              <div className="space-y-2 mt-3">
                {STANDARD_HOURS.map((hour, hourIdx) => {
                  // Determine status across architects
                  // If viewing a single architect, check that architect's slot.
                  // If viewing all, find first available architect or show composite.
                  const targetArch = selectedArchitectId !== 'all'
                    ? ARCHITECTS.find((a) => a.id === selectedArchitectId) || ARCHITECTS[0]
                    : ARCHITECTS[hourIdx % ARCHITECTS.length];

                  const booked = isSlotBooked(dateStr, hour.label, targetArch.id);
                  // Staggered mock reservation for visual realism
                  const isPreReserved = (dayIndex === 1 && hourIdx === 1) || (dayIndex === 3 && hourIdx === 2);
                  const isUnavailable = booked || isPreReserved;

                  return (
                    <button
                      key={hour.slotKey}
                      onClick={() => !isUnavailable && handleOpenBooking(day, hour.label, targetArch)}
                      disabled={isUnavailable}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs font-mono group ${
                        isUnavailable
                          ? 'bg-slate-900/40 border-slate-800/50 text-slate-600 cursor-not-allowed opacity-60'
                          : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-200 group-hover:text-cyan-300">
                          {hour.label.split(' - ')[0]}
                        </span>
                        {isUnavailable ? (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-950 text-slate-500 border border-slate-800">
                            Booked
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500/20">
                            Open
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 mt-1.5 text-[10px] text-slate-400">
                        <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${targetArch.avatarGradient}`} />
                        <span className="truncate">{targetArch.name.split(' ')[0]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom day SLA note */}
              <div className="mt-3 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-500 text-center">
                1-Hour Sync Window
              </div>
            </div>
          );
        })}
      </div>

      {/* Booked Sessions List if Any Exist */}
      {bookings.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
              <CalendarCheck className="w-4 h-4 text-emerald-400" />
              <span>Your Confirmed Advisory Syncs ({bookings.length})</span>
            </h4>
            <span className="text-xs font-mono text-slate-500">Live Video Bridges Armed</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white font-mono">{b.date}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Confirmed
                    </span>
                  </div>
                  <div className="text-xs text-orange-400 font-mono font-semibold">{b.timeSlot}</div>
                  <div className="text-[11px] text-slate-300 font-sans mt-1 line-clamp-1">
                    {b.topic}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    Architect: <span className="text-cyan-400">{b.architectName}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-slate-800">
                  <a
                    href={b.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono text-center flex items-center justify-center space-x-1"
                  >
                    <Video className="w-3 h-3" />
                    <span>Join Bridge</span>
                  </a>
                  <button
                    onClick={() => handleDownloadIcs(b)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                    title="Download .ICS Event"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal / Dialog */}
      {activeSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => {
                setActiveSlot(null);
                setConfirmedBooking(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!confirmedBooking ? (
              <form onSubmit={handleSubmitBooking} className="space-y-5">
                {/* Header */}
                <div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-orange-400 mb-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-orange-400" />
                    <span>Confirm Weekly 1-Hour Alignment Slot</span>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-extrabold text-white">
                    Book Sync with {activeSlot.architect.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeSlot.architect.specialty}
                  </p>
                </div>

                {/* Selected Slot Metadata Card */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-200 font-bold">{activeSlot.formattedDate}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-orange-400">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <span>{activeSlot.timeSlot}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                    <Globe className="w-3.5 h-3.5 text-teal-400" />
                    <span>{selectedTimezone.split('/')[1] || selectedTimezone}</span>
                  </div>
                </div>

                {/* Organization & Email Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">
                      Client Organization
                    </label>
                    <input
                      type="text"
                      required
                      value={bookingOrg}
                      onChange={(e) => setBookingOrg(e.target.value)}
                      placeholder="Apex FinTech Systems"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">
                      Technical Lead Email
                    </label>
                    <input
                      type="email"
                      required
                      value={bookingEmail}
                      onChange={(e) => setBookingEmail(e.target.value)}
                      placeholder="cto@enterprise.io"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Primary Agenda Selection */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">
                    Sync Agenda & Focus Area
                  </label>
                  <select
                    value={bookingTopic}
                    onChange={(e) => setBookingTopic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none font-mono cursor-pointer"
                  >
                    {TOPIC_PRESETS.map((topic, i) => (
                      <option key={i} value={topic} className="bg-slate-900 text-slate-200">
                        {topic}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Repository / Spec Link */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">
                    Target Code Repository / PR (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={bookingRepo}
                      onChange={(e) => setBookingRepo(e.target.value)}
                      placeholder="https://github.com/apex-fintech/core-mesh"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 pl-9 text-xs text-white focus:outline-none font-mono"
                    />
                    <GitBranch className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Notes or Specific Architectural Invariants */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">
                    Specific Architectural Invariants or Questions
                  </label>
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="e.g. Review AWS KMS key policies for automatic shredding under GDPR Art. 17; verify sub-15m Aurora replication."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-white focus:outline-none font-sans"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setActiveSlot(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Reserving Window...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm 1-Hour Sync Booking</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Confirmation Card */
              <div className="space-y-6 text-center py-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">
                    Booking Confirmed
                  </span>
                  <h4 className="text-2xl font-extrabold text-white mt-1">
                    Advisory Sync Window Locked
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                    Your 1-hour alignment window with <strong className="text-white">{confirmedBooking.architectName}</strong> is reserved.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left font-mono text-xs space-y-2.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Reference ID:</span>
                    <span className="text-cyan-400 font-bold">{confirmedBooking.id}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Date & Window:</span>
                    <span className="text-white">{confirmedBooking.date} · {confirmedBooking.timeSlot}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Timezone:</span>
                    <span className="text-teal-400">{confirmedBooking.timezone}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Organization:</span>
                    <span className="text-white">{confirmedBooking.orgName}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Meeting Bridge:</span>
                    <div className="flex items-center space-x-2">
                      <a
                        href={confirmedBooking.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center space-x-1"
                      >
                        <Video className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Google Meet Bridge</span>
                      </a>
                      <button
                        onClick={() => handleCopyMeetingLink(confirmedBooking.meetingUrl)}
                        className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                        title="Copy Bridge Link"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => handleDownloadIcs(confirmedBooking)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-mono font-bold flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Download className="w-4 h-4 text-orange-400" />
                    <span>Download .ICS Calendar Event</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSlot(null);
                      setConfirmedBooking(null);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-mono font-bold transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
