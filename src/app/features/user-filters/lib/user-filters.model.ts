export interface UserFilters {
  search: string;
  role: string;
  department: string;
  country: string;
  jobTitle: string;
  active: string; // '' | 'true' | 'false'
}

export const EMPTY_FILTERS: UserFilters = {
  search: '',
  role: '',
  department: '',
  country: '',
  jobTitle: '',
  active: '',
};

