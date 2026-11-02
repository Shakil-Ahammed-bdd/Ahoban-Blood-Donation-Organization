import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { adminApi } from '../services/api/adminApi'
import { donorApi } from '../services/api/donorApi'
import { experienceApi } from '../services/api/experienceApi'

const EMPTY_DASHBOARD = {
  overview: null,
  users: [],
  usersPagination: null,
  admins: [],
  donors: [],
  experiences: [],
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function AdminDashboardPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [usersPage, setUsersPage] = useState(1)
  const [editingId, setEditingId] = useState('')
  const [editForm, setEditForm] = useState({ fullName: '', phone: '', role: 'admin' })
  const [newAdmin, setNewAdmin] = useState({ fullName: '', email: '', phone: '', password: '' })

  useEffect(() => {
    let active = true
    Promise.all([
      adminApi.overview(),
      adminApi.users({ page: usersPage, limit: 20 }),
      donorApi.list({ page: 1, limit: 8, sort: 'recent' }),
      experienceApi.list({ page: 1, limit: 6 }),
      isSuperAdmin ? adminApi.list() : Promise.resolve({ admins: [] }),
    ]).then(
      ([overviewResponse, usersResponse, donorsResponse, experiencesResponse, adminsResponse]) => {
        if (!active) return
        setDashboard({
          overview: overviewResponse.overview,
          users: usersResponse.users,
          usersPagination: usersResponse.pagination,
          admins: adminsResponse.admins,
          donors: donorsResponse.donors,
          experiences: experiencesResponse.experiences,
        })
      },
      (requestError) => {
        if (active) setError(requestError.message || 'The dashboard could not be loaded.')
      },
    ).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [isSuperAdmin, refreshVersion, usersPage])

  function refreshDashboard() {
    setError('')
    setLoading(true)
    setRefreshVersion((current) => current + 1)
  }

  async function createAdmin(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await adminApi.create(newAdmin)
      setNewAdmin({ fullName: '', email: '', phone: '', password: '' })
      setNotice('Admin account created.')
      refreshDashboard()
    } catch (requestError) {
      setError(requestError.message || 'The admin account could not be created.')
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(admin) {
    setEditingId(admin.id)
    setEditForm({ fullName: admin.fullName, phone: admin.phone, role: admin.role })
    setError('')
    setNotice('')
  }

  async function updateAdmin(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await adminApi.update(editingId, editForm)
      setEditingId('')
      setNotice('Admin account updated.')
      refreshDashboard()
    } catch (requestError) {
      setError(requestError.message || 'The admin account could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAdmin(admin) {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await adminApi.update(admin.id, { isActive: !admin.isActive })
      setNotice(`Admin account ${admin.isActive ? 'deactivated' : 'activated'}.`)
      refreshDashboard()
    } catch (requestError) {
      setError(requestError.message || 'The admin status could not be changed.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAdmin(admin) {
    if (!window.confirm(`Permanently delete the admin account for ${admin.fullName}?`)) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await adminApi.delete(admin.id)
      setNotice('Admin account deleted.')
      refreshDashboard()
    } catch (requestError) {
      setError(requestError.message || 'The admin account could not be deleted.')
    } finally {
      setSaving(false)
    }
  }

  const overview = dashboard.overview

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard-heading">
        <div>
          <span className="admin-eyebrow">{isSuperAdmin ? 'Super Admin' : 'Admin'} workspace</span>
          <h1>Admin Dashboard</h1>
          <p>Signed in as {user?.fullName || user?.email}.</p>
        </div>
        <button className="admin-secondary-button" disabled={loading} onClick={refreshDashboard} type="button">
          Refresh data
        </button>
      </header>

      {error && <p className="admin-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="admin-feedback is-success" role="status">{notice}</p>}
      {loading && <p className="admin-feedback" role="status">Loading dashboard data…</p>}

      {overview && (
        <section aria-label="Overview statistics" className="admin-stat-grid">
          {[
            ['Registered accounts', overview.totalAccounts],
            ['Users', overview.totalUsers],
            ['Public donors', overview.totalDonors],
            ['Public stories', overview.totalExperiences],
            ['Admins', overview.totalAdmins],
            ['Active admins', overview.activeAdmins],
          ].map(([label, count]) => (
            <article className="admin-stat-card" key={label}>
              <span>{label}</span>
              <strong>{count}</strong>
            </article>
          ))}
        </section>
      )}

      <section aria-labelledby="admin-users-title" className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-eyebrow">Accounts</span>
            <h2 id="admin-users-title">Users</h2>
          </div>
          <span>{dashboard.usersPagination?.total ?? dashboard.users.length} registered users</span>
        </div>
        {dashboard.users.length ? (
          <>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Ahoban ID</th><th>Status</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {dashboard.users.map((account) => (
                    <tr key={account.id}>
                      <td>{account.fullName}</td>
                      <td>{account.email}</td>
                      <td>{account.userId}</td>
                      <td>{account.isActive ? 'Active' : 'Inactive'}</td>
                      <td>{formatDate(account.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dashboard.usersPagination?.pages > 1 && (
              <div className="admin-pagination">
                <button
                  className="admin-secondary-button"
                  disabled={usersPage <= 1 || loading}
                  onClick={() => { setLoading(true); setUsersPage((page) => page - 1) }}
                  type="button"
                >
                  Previous
                </button>
                <span>Page {usersPage} of {dashboard.usersPagination.pages}</span>
                <button
                  className="admin-secondary-button"
                  disabled={usersPage >= dashboard.usersPagination.pages || loading}
                  onClick={() => { setLoading(true); setUsersPage((page) => page + 1) }}
                  type="button"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : !loading && <p className="admin-empty">No registered users yet.</p>}
      </section>

      <section aria-labelledby="admin-donors-title" className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-eyebrow">Opted in to public search</span>
            <h2 id="admin-donors-title">Donors</h2>
          </div>
          <Link to="/donors">Open donor directory</Link>
        </div>
        {dashboard.donors.length ? (
          <ul className="admin-list">
            {dashboard.donors.map((donor) => (
              <li key={donor.id}>
                <span className="admin-list-mark">{donor.bloodGroup}</span>
                <span><strong>{donor.fullName}</strong><small>{donor.district}, {donor.division} · {donor.userId}</small></span>
              </li>
            ))}
          </ul>
        ) : !loading && <p className="admin-empty">No opted-in donors found.</p>}
      </section>

      <section aria-labelledby="admin-stories-title" className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-eyebrow">Public immediately after submission</span>
            <h2 id="admin-stories-title">Donor experiences</h2>
          </div>
          <Link to="/donor-experiences">Open stories</Link>
        </div>
        {dashboard.experiences.length ? (
          <ul className="admin-story-list">
            {dashboard.experiences.map((experience) => (
              <li key={experience.id}>
                <div><strong>{experience.donorName}</strong><time>{formatDate(experience.createdAt)}</time></div>
                <p>{experience.message}</p>
              </li>
            ))}
          </ul>
        ) : !loading && <p className="admin-empty">No public experiences found.</p>}
      </section>

      {isSuperAdmin && (
        <section aria-labelledby="admin-management-title" className="admin-panel admin-management">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-eyebrow">Super Admin only</span>
              <h2 id="admin-management-title">Admin management</h2>
            </div>
            <span>{dashboard.admins.length} admins</span>
          </div>

          <form className="admin-create-form" onSubmit={createAdmin}>
            <h3>Create an admin account</h3>
            <label>
              Full name
              <input autoComplete="name" maxLength="100" onChange={(event) => setNewAdmin((value) => ({ ...value, fullName: event.target.value }))} required value={newAdmin.fullName} />
            </label>
            <label>
              Email
              <input autoComplete="email" onChange={(event) => setNewAdmin((value) => ({ ...value, email: event.target.value }))} required type="email" value={newAdmin.email} />
            </label>
            <label>
              Phone
              <input autoComplete="tel" maxLength="16" onChange={(event) => setNewAdmin((value) => ({ ...value, phone: event.target.value }))} required value={newAdmin.phone} />
            </label>
            <label>
              Temporary password
              <input autoComplete="new-password" minLength="12" onChange={(event) => setNewAdmin((value) => ({ ...value, password: event.target.value }))} required type="password" value={newAdmin.password} />
            </label>
            <button className="admin-primary-button" disabled={saving} type="submit">
              {saving ? 'Saving…' : 'Create admin'}
            </button>
          </form>

          <ul className="admin-account-list">
            {dashboard.admins.map((admin) => (
              <li key={admin.id}>
                {editingId === admin.id ? (
                  <form className="admin-account-edit" onSubmit={updateAdmin}>
                    <label>
                      Full name
                      <input maxLength="100" onChange={(event) => setEditForm((value) => ({ ...value, fullName: event.target.value }))} required value={editForm.fullName} />
                    </label>
                    <label>
                      Phone
                      <input maxLength="16" onChange={(event) => setEditForm((value) => ({ ...value, phone: event.target.value }))} required value={editForm.phone} />
                    </label>
                    <label>
                      Role
                      <select onChange={(event) => setEditForm((value) => ({ ...value, role: event.target.value }))} value={editForm.role}>
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                      </select>
                    </label>
                    <div className="admin-row-actions">
                      <button className="admin-primary-button" disabled={saving} type="submit">Save</button>
                      <button className="admin-secondary-button" onClick={() => setEditingId('')} type="button">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span><strong>{admin.fullName}</strong><small>{admin.email} · {admin.userId}</small></span>
                    <span className={`admin-status${admin.isActive ? ' is-active' : ''}`}>{admin.isActive ? 'Active' : 'Inactive'}</span>
                    <div className="admin-row-actions">
                      <button className="admin-secondary-button" disabled={saving} onClick={() => beginEdit(admin)} type="button">Edit</button>
                      <button className="admin-secondary-button" disabled={saving} onClick={() => toggleAdmin(admin)} type="button">
                        {admin.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="admin-danger-button" disabled={saving} onClick={() => deleteAdmin(admin)} type="button">Delete</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          {!dashboard.admins.length && !loading && <p className="admin-empty">No admin accounts yet.</p>}
        </section>
      )}
    </main>
  )
}

export default AdminDashboardPage
