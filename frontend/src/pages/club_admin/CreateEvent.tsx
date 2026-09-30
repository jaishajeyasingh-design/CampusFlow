import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import eventsService from '../../services/eventsService';
import { extractApiErrorMessage } from '../../services/api';
import type { Club } from '../../types';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const CreateEvent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields matching backend EventCreate schema
  const [clubId, setClubId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technical');
  const [venue, setVenue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('12:00');
  const [capacity, setCapacity] = useState<number>(50);

  useEffect(() => {
    eventsService.getClubs()
      .then((fetchedClubs) => {
        setClubs(fetchedClubs);
        if (user) {
          const myClubs = fetchedClubs.filter((c) => c.club_admin_id === user.id);
          if (myClubs.length > 0) {
            setClubId(myClubs[0].id);
          } else if (fetchedClubs.length > 0) {
            setClubId(fetchedClubs[0].id);
          }
        }
      })
      .catch((err) => {
        setError(extractApiErrorMessage(err, 'Failed to fetch clubs list.'));
      })
      .finally(() => setLoadingClubs(false));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) {
      setError('Please select a valid club.');
      return;
    }
    if (!title.trim()) {
      setError('Event title is required.');
      return;
    }
    if (!venue.trim()) {
      setError('Event venue is required.');
      return;
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      setError('Please provide complete start and end date/times.');
      return;
    }
    if (capacity <= 0) {
      setError('Event capacity must be greater than zero.');
      return;
    }

    const startISO = new Date(`${startDate}T${startTime}`).toISOString();
    const endISO = new Date(`${endDate}T${endTime}`).toISOString();

    if (new Date(startISO) >= new Date(endISO)) {
      setError('Start time must be strictly before end time.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await eventsService.createEvent({
        club_id: Number(clubId),
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        venue: venue.trim(),
        start_time: startISO,
        end_time: endISO,
        capacity: Number(capacity),
      });

      navigate('/club-admin/events');
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Failed to create event. Please check inputs.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Link & Header */}
      <div className="space-y-2">
        <Link
          to="/club-admin/events"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Club Events</span>
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Create New Club Event</h1>
        <p className="text-xs text-slate-500">
          Newly created events start as <span className="font-semibold text-slate-700">DRAFT</span> and can be submitted for faculty approval when ready.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Club Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Organizing Club <span className="text-rose-500">*</span>
            </label>
            <select
              value={clubId}
              onChange={(e) => setClubId(Number(e.target.value))}
              disabled={loadingClubs}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-600"
              required
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Event Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AI & Robotics Bootcamp 2026"
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-600"
              >
                <option value="Technical">Technical</option>
                <option value="Cultural">Cultural</option>
                <option value="Workshop">Workshop</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Seminar">Seminar</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Event Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide event details, objectives, speaker information, and prerequisites..."
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>

          {/* Venue & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Venue Location <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Auditorium Hall B, Main Campus"
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Capacity Seats <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          {/* Date & Time Grid */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Event Schedule Timing
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Start Date & Time</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                    required
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">End Date & Time</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                    required
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <Link
              to="/club-admin/events"
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              Cancel
            </Link>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={submitting}
            >
              Create Event Draft
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
