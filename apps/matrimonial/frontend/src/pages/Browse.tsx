import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, X, Heart } from 'lucide-react';
import { api } from '../api';
import ProfileCard from '../components/ProfileCard';
import type { Profile, BrowseFilters } from '../types';
import { RELIGIONS, EDUCATION_LEVELS, PROFESSIONS, SALARY_RANGES, MOTHER_TONGUES } from '../types';
import { LoadingSpinner, EmptyState } from '../components/shared';

const defaultFilters: BrowseFilters = {
  gender: 'all', minAge: '', maxAge: '', religion: 'all', profession: 'all',
  salaryRange: 'all', location: 'all', education: 'all', maritalStatus: 'all',
  diet: 'all', motherTongue: 'all', search: '',
};

export default function Browse() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BrowseFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const cleanFilters: Partial<BrowseFilters> = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          (cleanFilters as any)[key] = value;
        }
      });
      const data = await api.profiles.browse(cleanFilters);
      setProfiles(data.profiles);
      setTotal(data.total);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const debounce = setTimeout(fetchProfiles, 300);
    return () => clearTimeout(debounce);
  }, [fetchProfiles]);

  const updateFilter = (field: keyof BrowseFilters) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setFilters(prev => ({ ...prev, [field]: e.target.value }));

  const resetFilters = () => setFilters(defaultFilters);

  const activeFilterCount = Object.entries(filters).filter(
    ([key, val]) => val && val !== 'all' && key !== 'search'
  ).length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-display">Discover Your Match</h1>
        <p className="text-gray-500 mt-1">Browse profiles and find your soulmate</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={updateFilter('search')}
            className="input-field pl-12"
            placeholder="Search by name, profession, or location..."
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary flex items-center gap-2 ${showFilters ? 'border-primary-500 bg-primary-50' : ''}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="card p-6 mb-6 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Filter Profiles</h3>
            <div className="flex gap-2">
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Clear All
                </button>
              )}
              <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
              <select value={filters.gender} onChange={updateFilter('gender')} className="select-field text-sm py-2.5">
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min Age</label>
              <input type="number" value={filters.minAge} onChange={updateFilter('minAge')}
                className="input-field text-sm py-2.5" placeholder="18" min="18" max="70" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Age</label>
              <input type="number" value={filters.maxAge} onChange={updateFilter('maxAge')}
                className="input-field text-sm py-2.5" placeholder="60" min="18" max="70" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Religion</label>
              <select value={filters.religion} onChange={updateFilter('religion')} className="select-field text-sm py-2.5">
                <option value="all">All</option>
                {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Education</label>
              <select value={filters.education} onChange={updateFilter('education')} className="select-field text-sm py-2.5">
                <option value="all">All</option>
                {EDUCATION_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Profession</label>
              <select value={filters.profession} onChange={updateFilter('profession')} className="select-field text-sm py-2.5">
                <option value="all">All</option>
                {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Salary Range</label>
              <select value={filters.salaryRange} onChange={updateFilter('salaryRange')} className="select-field text-sm py-2.5">
                <option value="all">All</option>
                {SALARY_RANGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mother Tongue</label>
              <select value={filters.motherTongue} onChange={updateFilter('motherTongue')} className="select-field text-sm py-2.5">
                <option value="all">All</option>
                {MOTHER_TONGUES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marital Status</label>
              <select value={filters.maritalStatus} onChange={updateFilter('maritalStatus')} className="select-field text-sm py-2.5">
                <option value="all">All</option>
                <option value="Never Married">Never Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Diet</label>
              <select value={filters.diet} onChange={updateFilter('diet')} className="select-field text-sm py-2.5">
                <option value="all">All</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Vegan">Vegan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <input type="text" value={filters.location === 'all' ? '' : filters.location}
                onChange={e => setFilters(prev => ({ ...prev, location: e.target.value || 'all' }))}
                className="input-field text-sm py-2.5" placeholder="City name" />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {loading ? 'Searching...' : `${total} profile${total !== 1 ? 's' : ''} found`}
        </p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-16 h-16 text-gray-300" />}
          title="No profiles found"
          subtitle="Try adjusting your filters to see more results"
          action={activeFilterCount > 0 ? <button onClick={resetFilters} className="btn-secondary">Clear Filters</button> : undefined}
          className="py-20"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {profiles.map(profile => (
            <ProfileCard key={profile.userId} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
