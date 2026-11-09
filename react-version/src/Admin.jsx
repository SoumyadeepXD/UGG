import { useState, useEffect } from 'react';
import { DEF } from './content.js';
import { merge, sha, uploadFile, syncGoogleSheet, checkBackendStatus, fixImgUrl } from './util.js';

const STATUS_OPTIONS = [
  { val: 'live', label: '🔴 Live Now' },
  { val: 'registering', label: '⚡ Registering' },
  { val: 'upcoming', label: '📅 Upcoming' },
  { val: 'completed', label: '🏁 Completed' },
];

const GAME_PRESETS = [
  'Valorant',
  'BGMI',
  'EA Sports FC 25',
  'Free Fire',
  'CS2',
  'Rocket League',
  'Call of Duty',
  'Dota 2',
  'Tekken 8',
];

const DESIGNATION_PRESETS = [
  'President & Founder',
  'Vice President',
  'General Secretary',
  'Esports Coordinator',
  'Head of Media & PR',
  'Tech & Web Lead',
  'Game Dev Lead',
  'Tournament Admin',
  'Design & Branding Lead',
  'Content & Casting Lead',
];

export default function Admin({ content, onChange, onSave, onClose, onLogout, toast }) {
  const [draft, setDraft] = useState(() => structuredClone(content));
  const [activeTab, setActiveTab] = useState('tournaments');
  const [open, setOpen] = useState(false);
  const [serverOnline, setServerOnline] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Tournament Form State
  const [newTourney, setNewTourney] = useState({
    title: '',
    game: 'Valorant',
    status: 'upcoming',
    date: '',
    meta: 'Prize: ₹10,000',
    img: '',
    url: '',
    cta: 'Register now',
    description: '',
    format: '5v5 Single Elimination',
    platform: 'PC',
  });

  // Member Form State
  const [newMember, setNewMember] = useState({
    name: '',
    role: 'Esports Coordinator',
    img: '',
    link: '',
  });

  // Gallery Form State
  const [newGallery, setNewGallery] = useState({
    img: '',
    caption: '',
  });

  // Timeline Form State
  const [newTimeline, setNewTimeline] = useState({
    date: '',
    title: '',
    status: 'upcoming',
  });

  // Google Sheet URL State
  const [sheetUrl, setSheetUrl] = useState('');
  const [newWord, setNewWord] = useState('');

  useEffect(() => {
    const r = requestAnimationFrame(() => setOpen(true));
    checkBackendStatus().then(setServerOnline);
    return () => cancelAnimationFrame(r);
  }, []);

  const mut = (fn) => {
    const d = structuredClone(draft);
    fn(d);
    setDraft(d);
    onChange(d);
  };

  const handleFileUpload = async (file, callback) => {
    if (!file) return;
    setUploading(true);
    toast('Uploading file...');
    try {
      const url = await uploadFile(file);
      callback(url);
      toast('File uploaded successfully!');
    } catch (err) {
      toast(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ----------------- TOURNAMENT HANDLERS -----------------
  const addTournament = () => {
    if (!newTourney.title.trim()) return toast('Please enter a tournament title.');
    mut((d) => {
      if (!d.events) d.events = { items: [] };
      if (!Array.isArray(d.events.items)) d.events.items = [];
      d.events.items.unshift({ ...newTourney });
    });
    setNewTourney({
      title: '',
      game: 'Valorant',
      status: 'upcoming',
      date: '',
      meta: 'Prize: ₹10,000',
      img: '',
      url: '',
      cta: 'Register now',
      description: '',
      format: '5v5 Single Elimination',
      platform: 'PC',
    });
    toast('Tournament added!');
  };

  const removeTournament = (index) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;
    mut((d) => d.events.items.splice(index, 1));
    toast('Tournament deleted');
  };

  const moveTournament = (index, dir) => {
    mut((d) => {
      const arr = d.events.items;
      const target = index + dir;
      if (target >= 0 && target < arr.length) {
        [arr[index], arr[target]] = [arr[target], arr[index]];
      }
    });
  };

  // ----------------- MEMBER HANDLERS -----------------
  const addMember = () => {
    if (!newMember.name.trim() || !newMember.role.trim()) {
      return toast('Please enter member name and designation.');
    }
    mut((d) => {
      if (!d.team) d.team = { items: [] };
      if (!Array.isArray(d.team.items)) d.team.items = [];
      d.team.items.push({ ...newMember });
    });
    setNewMember({ name: '', role: 'Esports Coordinator', img: '', link: '' });
    toast('Member added!');
  };

  const removeMember = (index) => {
    if (!confirm('Delete this team member?')) return;
    mut((d) => d.team.items.splice(index, 1));
    toast('Member deleted');
  };

  const moveMember = (index, dir) => {
    mut((d) => {
      const arr = d.team.items;
      const target = index + dir;
      if (target >= 0 && target < arr.length) {
        [arr[index], arr[target]] = [arr[target], arr[index]];
      }
    });
  };

  // ----------------- GALLERY HANDLERS -----------------
  const addGalleryItem = () => {
    if (!newGallery.img && !newGallery.caption.trim()) {
      return toast('Please provide an image or caption.');
    }
    mut((d) => {
      if (!d.gallery) d.gallery = { items: [] };
      if (!Array.isArray(d.gallery.items)) d.gallery.items = [];
      d.gallery.items.unshift({ ...newGallery });
    });
    setNewGallery({ img: '', caption: '' });
    toast('Photo added to gallery!');
  };

  const removeGalleryItem = (index) => {
    if (!confirm('Delete this gallery photo?')) return;
    mut((d) => d.gallery.items.splice(index, 1));
    toast('Photo removed');
  };

  // ----------------- TIMELINE HANDLERS -----------------
  const addTimelineItem = () => {
    if (!newTimeline.title.trim()) return toast('Please enter event milestone title.');
    mut((d) => {
      if (!d.timeline) d.timeline = { items: [] };
      d.timeline.items.push({ ...newTimeline });
    });
    setNewTimeline({ date: '', title: '', status: 'upcoming' });
    toast('Timeline milestone added!');
  };

  const removeTimelineItem = (index) => {
    mut((d) => d.timeline.items.splice(index, 1));
    toast('Milestone removed');
  };

  // ----------------- GOOGLE SHEET SYNC -----------------
  const handleSheetSync = async () => {
    if (!sheetUrl.trim()) return toast('Please enter a valid Google Sheet CSV URL.');
    toast('Syncing with Google Sheets...');
    try {
      const tourneys = await syncGoogleSheet(sheetUrl.trim());
      mut((d) => {
        d.events.items = tourneys;
      });
      toast(`Successfully synced ${tourneys.length} tournaments!`);
    } catch (err) {
      toast(err.message || 'Sheet sync failed');
    }
  };

  // ----------------- SAVE & BACKUP -----------------
  const handleSave = async () => {
    const d = structuredClone(draft);
    if (d.admin.newPassword) {
      if (d.admin.newPassword.length < 6) return toast('Use at least 6 characters for password.');
      d.admin.hash = await sha(d.admin.newPassword);
      toast('Admin password updated');
    }
    d.admin.newPassword = '';
    setDraft(d);
    onSave(d);
  };

  const exportJson = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
    a.download = `ugg-content-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast('Content exported as JSON backup');
  };

  const importJson = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = merge(DEF, JSON.parse(r.result));
        setDraft(d);
        onChange(d);
        toast('Backup imported successfully! Press "Save" to publish.');
      } catch {
        toast('Invalid JSON backup file.');
      }
    };
    r.readAsText(file);
  };

  const handleReset = () => {
    if (!confirm('Reset all site data back to factory defaults?')) return;
    const d = structuredClone(DEF);
    d.admin.hash = draft.admin.hash;
    setDraft(d);
    onChange(d);
    toast('Reset to default content template.');
  };

  return (
    <aside id="adm" className={`adm-panel ${open ? 'on' : ''}`} aria-label="Admin Control Center">
      {/* Top Header */}
      <div className="adm-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <b className="adm-title">🎮 UGG CONTROL CENTER</b>
          <span className={`adm-status-badge ${serverOnline ? 'online' : 'local'}`}>
            {serverOnline === null ? 'Checking...' : serverOnline ? '🟢 Server Online' : '🟡 Local Mode'}
          </span>
        </div>
        <div className="adm-header-actions">
          <button className="btn fill sm" onClick={handleSave} disabled={uploading}>
            💾 Save & Publish
          </button>
          <button className="sm" onClick={onClose}>Close</button>
          <button className="sm" onClick={onLogout}>Log out</button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="adm-nav">
        {[
          { id: 'tournaments', label: '🏆 Tournaments' },
          { id: 'team', label: '👥 Team & Roles' },
          { id: 'gallery', label: '🖼️ Gallery' },
          { id: 'timeline', label: '⏳ Timeline' },
          { id: 'sponsors', label: '🤝 Sponsors' },
          { id: 'hero', label: '⚡ Hero & Brand' },
          { id: 'theme', label: '🎨 Theme' },
          { id: 'sync', label: '⚙️ Sync & Cloud' },
        ].map((t) => (
          <button
            key={t.id}
            className={`adm-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div className="adm-body">
        {/* ========================================================= */}
        {/* TAB 1: TOURNAMENTS */}
        {/* ========================================================= */}
        {activeTab === 'tournaments' && (
          <div className="adm-section">
            <div className="adm-card new-form">
              <h3>⚡ Add New Tournament</h3>
              <div className="adm-grid-2">
                <div>
                  <label>Tournament Title *</label>
                  <input
                    placeholder="e.g. Valorant: Clash of Radiants"
                    value={newTourney.title}
                    onChange={(e) => setNewTourney({ ...newTourney, title: e.target.value })}
                  />
                </div>
                <div>
                  <label>Game Title</label>
                  <input
                    list="game-presets"
                    placeholder="e.g. Valorant, BGMI..."
                    value={newTourney.game}
                    onChange={(e) => setNewTourney({ ...newTourney, game: e.target.value })}
                  />
                  <datalist id="game-presets">
                    {GAME_PRESETS.map((g) => <option key={g} value={g} />)}
                  </datalist>
                </div>
              </div>

              <div className="adm-grid-3">
                <div>
                  <label>Status</label>
                  <select
                    value={newTourney.status}
                    onChange={(e) => setNewTourney({ ...newTourney, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.val} value={o.val}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Event Date(s)</label>
                  <input
                    placeholder="e.g. Nov 15 – Nov 18"
                    value={newTourney.date}
                    onChange={(e) => setNewTourney({ ...newTourney, date: e.target.value })}
                  />
                </div>
                <div>
                  <label>Prize / Details</label>
                  <input
                    placeholder="e.g. ₹10,000 + Trophy"
                    value={newTourney.meta}
                    onChange={(e) => setNewTourney({ ...newTourney, meta: e.target.value })}
                  />
                </div>
              </div>

              <div className="adm-grid-2">
                <div>
                  <label>Registration Link (Google Forms / Discord)</label>
                  <input
                    placeholder="https://docs.google.com/forms/..."
                    value={newTourney.url}
                    onChange={(e) => setNewTourney({ ...newTourney, url: e.target.value })}
                  />
                </div>
                <div>
                  <label>Poster Image (URL or Upload)</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      placeholder="Paste image URL or click Upload"
                      value={newTourney.img}
                      onChange={(e) => setNewTourney({ ...newTourney, img: e.target.value })}
                    />
                    <label className="adm-upload-btn">
                      Upload
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files[0], (url) => setNewTourney((prev) => ({ ...prev, img: url })))}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {newTourney.img && (
                <div className="adm-preview-box">
                  <small>Poster Preview:</small>
                  <img src={fixImgUrl(newTourney.img)} alt="Poster preview" style={{ height: 80, borderRadius: 6, objectFit: 'cover' }} />
                </div>
              )}

              <button className="btn fill" onClick={addTournament} style={{ marginTop: 10 }}>
                + Add Tournament to Showdowns
              </button>
            </div>

            <div className="adm-list-header">
              <h4>Active Tournaments ({draft.events?.items?.length || 0})</h4>
            </div>

            <div className="adm-items-list">
              {draft.events?.items?.map((item, idx) => (
                <div key={idx} className="adm-item-card">
                  <div className="adm-item-thumb">
                    {item.img ? <img src={fixImgUrl(item.img)} alt={item.title} /> : <div className="adm-placeholder-box">🎮</div>}
                  </div>
                  <div className="adm-item-info">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`tag ${item.status}`}>{item.status}</span>
                      <small style={{ color: 'var(--red)', fontWeight: 700 }}>{item.game}</small>
                    </div>
                    <b>{item.title}</b>
                    <small style={{ color: 'var(--mut)' }}>{item.date} • {item.meta}</small>
                  </div>
                  <div className="adm-item-controls">
                    <select
                      value={item.status}
                      onChange={(e) => mut((d) => { d.events.items[idx].status = e.target.value; })}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.val} value={o.val}>{o.label}</option>
                      ))}
                    </select>
                    <button className="sm" onClick={() => moveTournament(idx, -1)} disabled={idx === 0}>↑</button>
                    <button className="sm" onClick={() => moveTournament(idx, 1)} disabled={idx === (draft.events.items.length - 1)}>↓</button>
                    <button className="sm danger" onClick={() => removeTournament(idx)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: TEAM & DESIGNATIONS */}
        {/* ========================================================= */}
        {activeTab === 'team' && (
          <div className="adm-section">
            <div className="adm-card new-form">
              <h3>👥 Add Team Member</h3>
              <div className="adm-grid-2">
                <div>
                  <label>Full Name *</label>
                  <input
                    placeholder="e.g. Soumyadeep Roy"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  />
                </div>
                <div>
                  <label>Designation / Role *</label>
                  <input
                    list="designation-presets"
                    placeholder="e.g. President, Esports Lead..."
                    value={newMember.role}
                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  />
                  <datalist id="designation-presets">
                    {DESIGNATION_PRESETS.map((p) => <option key={p} value={p} />)}
                  </datalist>
                </div>
              </div>

              <div className="adm-grid-2">
                <div>
                  <label>Profile Photo (URL or Upload)</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      placeholder="Paste image URL or click Upload"
                      value={newMember.img}
                      onChange={(e) => setNewMember({ ...newMember, img: e.target.value })}
                    />
                    <label className="adm-upload-btn">
                      Upload
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files[0], (url) => setNewMember((prev) => ({ ...prev, img: url })))}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label>Social / Connect Link (LinkedIn, Instagram, Discord)</label>
                  <input
                    placeholder="https://linkedin.com/in/..."
                    value={newMember.link}
                    onChange={(e) => setNewMember({ ...newMember, link: e.target.value })}
                  />
                </div>
              </div>

              {newMember.img && (
                <div className="adm-preview-box">
                  <small>Avatar Preview:</small>
                  <img src={fixImgUrl(newMember.img)} alt="Member preview" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                </div>
              )}

              <button className="btn fill" onClick={addMember} style={{ marginTop: 10 }}>
                + Add Member to Roster
              </button>
            </div>

            <div className="adm-list-header">
              <h4>Team Roster & Leadership ({draft.team?.items?.length || 0})</h4>
            </div>

            <div className="adm-items-list">
              {draft.team?.items?.map((item, idx) => (
                <div key={idx} className="adm-item-card">
                  <div className="adm-member-avatar">
                    {item.img ? (
                      <img src={fixImgUrl(item.img)} alt={item.name} />
                    ) : (
                      <div className="adm-avatar-placeholder">{(item.name || '?')[0]}</div>
                    )}
                  </div>
                  <div className="adm-item-info">
                    <b>{item.name}</b>
                    <span className="adm-badge">{item.role}</span>
                    {item.link && <small style={{ color: 'var(--mut)', wordBreak: 'break-all' }}>{item.link}</small>}
                  </div>
                  <div className="adm-item-controls">
                    <button className="sm" onClick={() => moveMember(idx, -1)} disabled={idx === 0}>↑</button>
                    <button className="sm" onClick={() => moveMember(idx, 1)} disabled={idx === (draft.team.items.length - 1)}>↓</button>
                    <button className="sm danger" onClick={() => removeMember(idx)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: GALLERY */}
        {/* ========================================================= */}
        {activeTab === 'gallery' && (
          <div className="adm-section">
            <div className="adm-card new-form">
              <h3>🖼️ Add Gallery Photo</h3>
              <div>
                <label>Image Source (URL or File Upload)</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    placeholder="Paste image URL or click Upload"
                    value={newGallery.img}
                    onChange={(e) => setNewGallery({ ...newGallery, img: e.target.value })}
                  />
                  <label className="adm-upload-btn">
                    Upload
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files[0], (url) => setNewGallery((prev) => ({ ...prev, img: url })))}
                    />
                  </label>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <label>Caption / Event Tag</label>
                <input
                  placeholder="e.g. BGMI LAN finals – auditorium packed"
                  value={newGallery.caption}
                  onChange={(e) => setNewGallery({ ...newGallery, caption: e.target.value })}
                />
              </div>

              {newGallery.img && (
                <div className="adm-preview-box">
                  <small>Preview:</small>
                  <img src={fixImgUrl(newGallery.img)} alt="Gallery preview" style={{ height: 100, borderRadius: 8, objectFit: 'cover' }} />
                </div>
              )}

              <button className="btn fill" onClick={addGalleryItem} style={{ marginTop: 10 }}>
                + Add Photo to Gallery
              </button>
            </div>

            <div className="adm-list-header">
              <h4>Gallery Showcase ({draft.gallery?.items?.length || 0} Photos)</h4>
            </div>

            <div className="adm-gallery-grid">
              {draft.gallery?.items?.map((item, idx) => (
                <div key={idx} className="adm-gallery-card">
                  <div className="adm-gallery-img">
                    {item.img ? <img src={fixImgUrl(item.img)} alt={item.caption} /> : <div className="adm-placeholder-box">🖼️</div>}
                  </div>
                  <input
                    className="adm-gallery-input"
                    value={item.caption || ''}
                    placeholder="Caption"
                    onChange={(e) => mut((d) => { d.gallery.items[idx].caption = e.target.value; })}
                  />
                  <button className="sm danger full-w" onClick={() => removeGalleryItem(idx)}>
                    🗑️ Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: TIMELINE */}
        {/* ========================================================= */}
        {activeTab === 'timeline' && (
          <div className="adm-section">
            <div className="adm-card new-form">
              <h3>⏳ Add Milestone Slot</h3>
              <div className="adm-grid-3">
                <div>
                  <label>Date / Time Window</label>
                  <input
                    placeholder="e.g. Dec 8 – Dec 10"
                    value={newTimeline.date}
                    onChange={(e) => setNewTimeline({ ...newTimeline, date: e.target.value })}
                  />
                </div>
                <div>
                  <label>Milestone Title</label>
                  <input
                    placeholder="e.g. CS2 Open Cup"
                    value={newTimeline.title}
                    onChange={(e) => setNewTimeline({ ...newTimeline, title: e.target.value })}
                  />
                </div>
                <div>
                  <label>Status</label>
                  <select
                    value={newTimeline.status}
                    onChange={(e) => setNewTimeline({ ...newTimeline, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.val} value={o.val}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="btn fill" onClick={addTimelineItem} style={{ marginTop: 10 }}>
                + Add Milestone to Timeline
              </button>
            </div>

            <div className="adm-list-header">
              <h4>Roadmap Slots ({draft.timeline?.items?.length || 0})</h4>
            </div>

            <div className="adm-items-list">
              {draft.timeline?.items?.map((item, idx) => (
                <div key={idx} className="adm-item-card">
                  <div className="adm-item-info">
                    <span className={`tag ${item.status}`}>{item.status}</span>
                    <b>{item.title}</b>
                    <small style={{ color: 'var(--mut)' }}>{item.date}</small>
                  </div>
                  <div className="adm-item-controls">
                    <button className="sm danger" onClick={() => removeTimelineItem(idx)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SPONSORS */}
        {/* ========================================================= */}
        {activeTab === 'sponsors' && (
          <div className="adm-section">
            <div className="adm-card">
              <h3>🤝 Sponsor Contacts & CTA</h3>
              <div className="adm-grid-2">
                <div>
                  <label>Sponsorship Email (Displayed on button)</label>
                  <input
                    value={draft.sponsors.email}
                    onChange={(e) => mut((d) => { d.sponsors.email = e.target.value; })}
                  />
                </div>
                <div>
                  <label>Sponsorship Custom Link (Optional override)</label>
                  <input
                    placeholder="https://... or leave empty for mailto"
                    value={draft.sponsors.link || ''}
                    onChange={(e) => mut((d) => { d.sponsors.link = e.target.value; })}
                  />
                </div>
              </div>
            </div>

            <div className="adm-list-header">
              <h4>Sponsor Logos & Partners ({draft.sponsors.items.length})</h4>
              <button
                className="sm"
                onClick={() => mut((d) => d.sponsors.items.push({ name: 'New Sponsor', logo: '', url: '#' }))}
              >
                + Add Sponsor
              </button>
            </div>

            <div className="adm-items-list">
              {draft.sponsors.items.map((sp, idx) => (
                <div key={idx} className="adm-item-card">
                  <div className="adm-item-info" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, width: '100%' }}>
                    <div>
                      <label>Sponsor Name</label>
                      <input
                        value={sp.name}
                        onChange={(e) => mut((d) => { d.sponsors.items[idx].name = e.target.value; })}
                      />
                    </div>
                    <div>
                      <label>Logo (URL or Upload)</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          value={sp.logo || ''}
                          placeholder="Logo URL"
                          onChange={(e) => mut((d) => { d.sponsors.items[idx].logo = e.target.value; })}
                        />
                        <label className="adm-upload-btn">
                          Upload
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e.target.files[0], (url) => mut((d) => { d.sponsors.items[idx].logo = url; }))}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label>Website Link</label>
                      <input
                        value={sp.url || ''}
                        placeholder="https://..."
                        onChange={(e) => mut((d) => { d.sponsors.items[idx].url = e.target.value; })}
                      />
                    </div>
                  </div>
                  <div className="adm-item-controls">
                    <button className="sm danger" onClick={() => mut((d) => d.sponsors.items.splice(idx, 1))}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: HERO & BRAND */}
        {/* ========================================================= */}
        {activeTab === 'hero' && (
          <div className="adm-section">
            <div className="adm-card">
              <h3>⚡ Brand Identity</h3>
              <div className="adm-grid-2">
                <div>
                  <label>Guild Name</label>
                  <input
                    value={draft.brand.name}
                    onChange={(e) => mut((d) => { d.brand.name = e.target.value; })}
                  />
                </div>
                <div>
                  <label>Subtitle / Motto</label>
                  <input
                    value={draft.brand.sub}
                    onChange={(e) => mut((d) => { d.brand.sub = e.target.value; })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <label>Guild Logo (URL or Upload)</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={draft.brand.logo || ''}
                    placeholder="Logo URL or DataURL"
                    onChange={(e) => mut((d) => { d.brand.logo = e.target.value; })}
                  />
                  <label className="adm-upload-btn">
                    Upload
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files[0], (url) => mut((d) => { d.brand.logo = url; }))}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="adm-card">
              <h3>🎯 Hero Section Content</h3>
              <div>
                <label>Kicker (Small top badge)</label>
                <input
                  value={draft.hero.kicker}
                  onChange={(e) => mut((d) => { d.hero.kicker = e.target.value; })}
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <label>Rotating Headline Words</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  {draft.hero.words?.map((w, idx) => (
                    <span key={idx} className="adm-word-chip">
                      {w}
                      <button onClick={() => mut((d) => d.hero.words.splice(idx, 1))}>×</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    placeholder="Add a word (e.g. CONQUER.)"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                  />
                  <button
                    className="sm"
                    onClick={() => {
                      if (!newWord.trim()) return;
                      mut((d) => {
                        if (!d.hero.words) d.hero.words = [];
                        d.hero.words.push(newWord.trim().toUpperCase());
                      });
                      setNewWord('');
                    }}
                  >
                    + Add Word
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <label>Hero Description Subtext</label>
                <textarea
                  rows={2}
                  value={draft.hero.text}
                  onChange={(e) => mut((d) => { d.hero.text = e.target.value; })}
                />
              </div>

              <div className="adm-grid-2" style={{ marginTop: 8 }}>
                <div>
                  <label>Background Video (MP4 URL or Upload)</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      placeholder="Leave empty for neon cyber canvas"
                      value={draft.hero.video || ''}
                      onChange={(e) => mut((d) => { d.hero.video = e.target.value; })}
                    />
                    <label className="adm-upload-btn">
                      Upload
                      <input
                        type="file"
                        hidden
                        accept="video/*"
                        onChange={(e) => handleFileUpload(e.target.files[0], (url) => mut((d) => { d.hero.video = url; }))}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label>Community Join URL</label>
                  <input
                    value={draft.hero.joinUrl || ''}
                    placeholder="Discord or WhatsApp link"
                    onChange={(e) => mut((d) => { d.hero.joinUrl = e.target.value; })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: THEME */}
        {/* ========================================================= */}
        {activeTab === 'theme' && (
          <div className="adm-section">
            <div className="adm-card">
              <h3>🎨 Theme Colors</h3>
              <div className="adm-grid-2">
                <div>
                  <label>Primary Accent Color (Neon Crimson)</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="color"
                      style={{ width: 50, height: 40, padding: 0, cursor: 'pointer' }}
                      value={draft.theme.accent}
                      onChange={(e) => mut((d) => { d.theme.accent = e.target.value; })}
                    />
                    <input
                      value={draft.theme.accent}
                      onChange={(e) => mut((d) => { d.theme.accent = e.target.value; })}
                    />
                  </div>
                </div>
                <div>
                  <label>Background Dark Tone</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="color"
                      style={{ width: 50, height: 40, padding: 0, cursor: 'pointer' }}
                      value={draft.theme.bg}
                      onChange={(e) => mut((d) => { d.theme.bg = e.target.value; })}
                    />
                    <input
                      value={draft.theme.bg}
                      onChange={(e) => mut((d) => { d.theme.bg = e.target.value; })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: SYNC & CLOUD */}
        {/* ========================================================= */}
        {activeTab === 'sync' && (
          <div className="adm-section">
            <div className="adm-card">
              <h3>📊 Google Sheets Live Synchronization</h3>
              <p style={{ fontSize: 13, color: 'var(--mut)', marginBottom: 8 }}>
                Sync tournament listings instantly from a published Google Sheet CSV (from the UGG repository integration).
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
                <button className="btn fill sm" onClick={handleSheetSync}>
                  🔄 Sync Now
                </button>
              </div>
            </div>

            <div className="adm-card">
              <h3>🔐 Admin Passkey Security</h3>
              <div>
                <label>New Admin Password</label>
                <input
                  type="password"
                  placeholder="Type a new password (min 6 characters), then click Save"
                  value={draft.admin.newPassword || ''}
                  onChange={(e) => mut((d) => { d.admin.newPassword = e.target.value; })}
                />
              </div>
            </div>

            <div className="adm-card">
              <h3>💾 Backup, Export & Factory Reset</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="sm" onClick={exportJson}>📥 Export Content Backup (JSON)</button>
                <label className="sm" style={{ margin: 0, cursor: 'pointer', color: '#fff', display: 'inline-flex', alignItems: 'center' }}>
                  📤 Import Content Backup
                  <input type="file" hidden accept="application/json" onChange={(e) => importJson(e.target.files[0])} />
                </label>
                <button className="sm danger" onClick={handleReset}>⚠️ Reset All to Factory Defaults</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
