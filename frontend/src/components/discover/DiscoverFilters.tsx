'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface DiscoverFiltersState {
  department: string[];
  year: string[];
  interests: string[];
}

interface DiscoverFiltersProps {
  filters: DiscoverFiltersState;
  onFiltersChange: (filters: DiscoverFiltersState) => void;
}

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Mechanical',
  'Civil',
  'Electrical',
  'Chemical',
  'Other'
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const INTERESTS = [
  'Music',
  'Movies',
  'Sports',
  'Gaming',
  'Reading',
  'Traveling',
  'Photography',
  'Cooking',
  'Art',
  'Dancing',
  'Fitness',
  'Technology',
  'Fashion',
  'Food'
];

export default function DiscoverFilters({ filters, onFiltersChange }: DiscoverFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleFilter = (category: keyof DiscoverFiltersState, value: string) => {
    const currentValues = filters[category];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    
    onFiltersChange({
      ...filters,
      [category]: newValues
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      department: [],
      year: [],
      interests: []
    });
  };

  const activeFilterCount = filters.department.length + filters.year.length + filters.interests.length;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="mb-4">
      {/* Filter button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-shadow"
      >
        <Filter className="w-5 h-5" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Active filters badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {[...filters.department, ...filters.year, ...filters.interests].map((filter) => (
            <span
              key={filter}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-sm rounded-full"
            >
              {filter}
              <button
                onClick={() => {
                  if (filters.department.includes(filter)) toggleFilter('department', filter);
                  else if (filters.year.includes(filter)) toggleFilter('year', filter);
                  else if (filters.interests.includes(filter)) toggleFilter('interests', filter);
                }}
                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filter panel */}
      {isOpen && (
        <div className="mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-4">
          {/* Department filter */}
          <div>
            <button
              onClick={() => toggleSection('department')}
              className="flex items-center justify-between w-full text-left font-medium mb-2"
            >
              <span>Department</span>
              {expandedSection === 'department' ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            {expandedSection === 'department' && (
              <div className="flex flex-wrap gap-2">
                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => toggleFilter('department', dept)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      filters.department.includes(dept)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Year filter */}
          <div>
            <button
              onClick={() => toggleSection('year')}
              className="flex items-center justify-between w-full text-left font-medium mb-2"
            >
              <span>Year</span>
              {expandedSection === 'year' ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            {expandedSection === 'year' && (
              <div className="flex flex-wrap gap-2">
                {YEARS.map((year) => (
                  <button
                    key={year}
                    onClick={() => toggleFilter('year', year)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      filters.year.includes(year)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interests filter */}
          <div>
            <button
              onClick={() => toggleSection('interests')}
              className="flex items-center justify-between w-full text-left font-medium mb-2"
            >
              <span>Interests</span>
              {expandedSection === 'interests' ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            {expandedSection === 'interests' && (
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleFilter('interests', interest)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      filters.interests.includes(interest)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t dark:border-gray-700">
            <button
              onClick={clearFilters}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Clear
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
