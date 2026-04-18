export default function StaffPage() {
  return (
    <div>
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
            Staff
          </h2>
          <p className="text-secondary mt-1">
            Manage staff members and their roles
          </p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 primary-gradient rounded-xl font-bold text-white shadow-xl">
          <span className="material-symbols-outlined">person_add</span>
          Add Staff
        </button>
      </div>
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-12 text-center">
        <span className="material-symbols-outlined text-5xl text-stone-300 mb-4">badge</span>
        <p className="font-headline font-bold text-on-surface text-lg">Staff Management</p>
        <p className="text-secondary text-sm mt-2">
          Manage staff members, roles, and outlet assignments.
        </p>
      </div>
    </div>
  );
}
