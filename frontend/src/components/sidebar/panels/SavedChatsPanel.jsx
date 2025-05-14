import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { API_BASE_URL } from '../../../constants'; // Assuming you have this constants file
import './SavedChatsPanel.css'; // <-- Import the CSS file

function SavedChatsPanel({ onSelectSession, onRenameSession }) {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Loading for initial list
  const [error, setError] = useState(null); // Error for initial list fetch
  const [loadingSessionId, setLoadingSessionId] = useState(null); // Track which session is loading
  const [sessionLoadError, setSessionLoadError] = useState(null); // Error specific to loading a session
  const [deletingSessionId, setDeletingSessionId] = useState(null); // Track deleting session
  const [deleteError, setDeleteError] = useState(null); // Error specific to deleting
  const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(
    localStorage.getItem('skipDeleteConfirm') === 'true'
  ); // User preference to skip delete confirmation

  // --- ADDED: State for editing ---
  const [editingSessionId, setEditingSessionId] = useState(null); // Track which session is being edited
  const [editingName, setEditingName] = useState(''); // Current value in the edit input
  const [renameError, setRenameError] = useState(null); // Error specific to renaming
  const [isRenaming, setIsRenaming] = useState(false); // Loading state for rename API call
  // --- END ADDED State ---

  // --- Fetch Sessions ---
  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setDeleteError(null); // Clear delete error on refresh
    setRenameError(null); // Clear rename error on refresh
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions`);
      if (!response.ok) {
        let errorMsg = `Failed to fetch sessions (status: ${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (parseError) { /* Ignore if response body isn't JSON */ }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError(err.message);
      setSessions([]); // Clear sessions on error
    } finally {
      setIsLoading(false);
    }
  }, []); // Removed unnecessary dependencies

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // --- Handle click on a session item --- 
  const handleSessionClick = async (threadId) => {
    // Prevent loading if deleting, editing, or already loading
    if (loadingSessionId || deletingSessionId === threadId || editingSessionId === threadId) return;

    console.log(`Attempting to load session: ${threadId}`);
    setLoadingSessionId(threadId);
    setSessionLoadError(null); // Clear previous load errors
    setDeleteError(null); // Clear delete errors
    setRenameError(null); // Clear rename errors

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/session/${threadId}`);
      if (!response.ok) {
        let errorMsg = `Failed to load session ${threadId} (status: ${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (parseError) { /* Ignore */ }
        throw new Error(errorMsg);
      }
      const loadedSessionData = await response.json();
      onSelectSession(loadedSessionData);
    } catch (err) {
      console.error("Error loading session:", err);
      setSessionLoadError(`Failed to load session ${threadId}: ${err.message}`);
    } finally {
      setLoadingSessionId(null); // Clear loading state
    }
  };

  // --- Handle Deleting a Session --- 
  const handleDeleteSession = async (threadId, event) => {
    event.stopPropagation(); // Prevent the click from triggering handleSessionClick

    // Prevent deleting if already deleting another, editing this one, or loading this one
    if (deletingSessionId || loadingSessionId === threadId || editingSessionId === threadId) return;

    // Optional: Confirm deletion (skip if user preference is set)
    if (!skipDeleteConfirm && !window.confirm(`Are you sure you want to delete session ${threadId}? This cannot be undone.`)) {
        return;
    }

    console.log(`Attempting to delete session: ${threadId}`);
    setDeletingSessionId(threadId); // Mark this session as being deleted
    setDeleteError(null); // Clear previous delete errors
    setSessionLoadError(null); // Clear load errors
    setRenameError(null); // Clear rename errors

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/chat/session/${threadId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            let errorMsg = `Failed to delete session ${threadId} (status: ${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.detail || errorMsg;
            } catch (parseError) { /* Ignore if response body isn't JSON */ }
            throw new Error(errorMsg);
        }

        // On successful deletion, remove the session from the list state
        setSessions(prevSessions => prevSessions.filter(session => session.thread_id !== threadId));
        console.log(`Session ${threadId} deleted successfully.`);
        // Optionally show a success message briefly?

    } catch (err) {
        console.error("Error deleting session:", err);
        setDeleteError(`Failed to delete session ${threadId}: ${err.message}`);
        // Keep the item in the list on error, but show the error message
    } finally {
        setDeletingSessionId(null); // Clear deleting state
    }
  };

  // --- ADDED: Handle starting the edit process ---
  const handleEditClick = (session, event) => {
    event.stopPropagation(); // Prevent click from loading the session
    if (isRenaming || deletingSessionId) return; // Don't allow edit while other actions are in progress
    setEditingSessionId(session.thread_id);
    setEditingName(session.title || session.thread_id); // Pre-fill with current title or ID
    setRenameError(null); // Clear previous rename errors
    setSessionLoadError(null); // Clear load errors
    setDeleteError(null); // Clear delete errors
  };

  // --- ADDED: Handle canceling the edit ---
  const handleCancelEdit = (event) => {
    event?.stopPropagation(); // Optional chaining for event
    setEditingSessionId(null);
    setEditingName('');
    setRenameError(null);
    setIsRenaming(false);
  };

  // --- ADDED: Handle saving the new name ---
  const handleSaveEdit = async (event) => {
    event?.stopPropagation();
    if (!editingSessionId || isRenaming) return;

    const newName = editingName.trim();
    if (!newName) {
        setRenameError("Session name cannot be empty.");
        return;
    }

    // Find the original title to check if it actually changed
    const originalSession = sessions.find(s => s.thread_id === editingSessionId);
    if (originalSession && newName === (originalSession.title || originalSession.thread_id)) {
      console.log("Name hasn't changed, canceling edit.");
      handleCancelEdit(); // Name didn't change, just close the input
      return;
    }

    setIsRenaming(true);
    setRenameError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/session/${editingSessionId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: newName }),
      });

      if (!response.ok) {
        let errorMsg = `Failed to rename session (status: ${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (parseError) { /* Ignore */ }
        throw new Error(errorMsg);
      }

      // --- Success --- 
      console.log(`Session ${editingSessionId} renamed to "${newName}" successfully.`);

      // 1. Update local session list state
      setSessions(prevSessions =>
        prevSessions.map(session =>
          session.thread_id === editingSessionId ? { ...session, title: newName } : session
        )
      );

      // 2. Call the callback prop to update App state (e.g., tab label)
      onRenameSession(editingSessionId, newName);

      // 3. Close the edit UI
      handleCancelEdit(); // Resets editing state variables

    } catch (err) {
      console.error("Error renaming session:", err);
      setRenameError(`Rename failed: ${err.message}`);
      // Keep the edit UI open on error
    } finally {
      setIsRenaming(false);
    }
  };
  // --- END ADDED HANDLERS ---

  // --- Format title or ID for display --- 
  const formatSessionDisplay = (session) => {
    if (session.title && session.title.trim() !== '') {
        // Truncate the title to first 25 characters with ellipsis
        const originalTitle = session.title;
        const truncatedTitle = originalTitle.length > 25 
          ? originalTitle.substring(0, 25) + '...' 
          : originalTitle;
        return { 
          title: truncatedTitle, 
          id: session.thread_id,
          fullTitle: originalTitle // Store full title for tooltip
        };
    }
    const parts = session.thread_id.split('_');
    if (parts.length >= 2) {
        const date = parts[0]; // YYYYMMDD
        const time = parts[1]; // HHMMSS
        const formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
        const formattedTime = `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`;
        return { 
          title: `${formattedDate} ${formattedTime}`, 
          id: session.thread_id,
          fullTitle: `${formattedDate} ${formattedTime}` 
        };
    }
    return { 
      title: session.thread_id, 
      id: session.thread_id,
      fullTitle: session.thread_id
    }; // Fallback to raw ID
  };

  return (
    <div className="saved-chats-panel">
      <h2 className="panel-title">Saved Chats <button onClick={fetchSessions} disabled={isLoading || isRenaming || !!editingSessionId || !!deletingSessionId} title="Refresh List">&#x21bb;</button></h2>
      {isLoading && <p>Loading sessions...</p>}
      {error && <p className="error-message">List Error: {error}</p>}
      {/* Display specific errors near the top for clarity */}
      {sessionLoadError && <p className="error-message">Load Error: {sessionLoadError}</p>}
      {deleteError && <p className="error-message">Delete Error: {deleteError}</p>}
      {/* --- ADDED: Rename Error display --- */}
      {renameError && <p className="error-message">Rename Error: {renameError}</p>}

      <div className="delete-confirm-option">
        <label>
          <input
            type="checkbox"
            checked={skipDeleteConfirm}
            onChange={(e) => {
              const newValue = e.target.checked;
              setSkipDeleteConfirm(newValue);
              localStorage.setItem('skipDeleteConfirm', newValue);
            }}
          />
          Don't ask for confirmation when deleting chats
        </label>
      </div>

      {!isLoading && !error && sessions.length === 0 && (
        <p>No saved sessions found.</p>
      )}
      {!isLoading && !error && sessions.length > 0 && (
        <ul className="saved-chats-list">
          {sessions.map((session) => {
            const display = formatSessionDisplay(session);
            const isThisLoading = loadingSessionId === session.thread_id;
            const isThisDeleting = deletingSessionId === session.thread_id;
            const isThisEditing = editingSessionId === session.thread_id;

            return (
              <li
                key={session.thread_id}
                className={`session-item ${isThisLoading ? 'is-loading' : ''} ${isThisDeleting ? 'is-deleting' : ''} ${isThisEditing ? 'is-editing' : ''}`}
                // Allow click only if not editing, deleting, or loading this specific item
                onClick={!isThisDeleting && !isThisEditing && !isThisLoading ? () => handleSessionClick(session.thread_id) : undefined}
                title={isThisEditing ? `Editing: ${session.thread_id}` : `Full text: "${display.fullTitle || ''}"`}
              >
                {/* --- MODIFIED: Conditional Rendering for Edit State --- */} 
                {isThisEditing ? (
                  <div className="session-edit-controls">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onClick={(e) => e.stopPropagation()} // Prevent click propagating to li
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(e);
                          if (e.key === 'Escape') handleCancelEdit(e);
                      }}
                      disabled={isRenaming}
                      autoFocus // Focus the input when it appears
                      className="session-edit-input"
                    />
                    <button
                      onClick={handleSaveEdit}
                      disabled={isRenaming || !editingName.trim()}
                      className="session-edit-button save"
                      title="Save Name (Enter)"
                    >
                      &#x2714; {/* Check mark */}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isRenaming}
                      className="session-edit-button cancel"
                      title="Cancel Edit (Esc)"
                    >
                      &#x2715; {/* Cross mark */}
                    </button>
                  </div>
                ) : (
                  <> { /* Original display + edit/delete buttons */}
                    <div className="session-info" onClick={() => handleSessionClick(session.thread_id)}> {/* Wrap text content */}
                      {isThisLoading && <strong>Loading...</strong>}
                      {isThisDeleting && <strong>Deleting...</strong>}
                      {!isThisLoading && !isThisDeleting && <strong>{display.title}</strong>}

                      {/* Optionally show ID if title is different and not loading/deleting */}
                      {!isThisLoading && !isThisDeleting && display.title !== display.id && <span>{display.id}</span>}
                    </div>
                    <div className="session-actions">
                      <button
                          className="edit-session-button"
                          onClick={(e) => handleEditClick(session, e)}
                          disabled={isThisDeleting || !!deletingSessionId || isThisLoading || !!editingSessionId || isRenaming}
                          title={`Rename session ${session.thread_id}`}
                      >
                          &#x270E; {/* Pencil icon */}
                      </button>
                      <button
                          className="delete-session-button"
                          onClick={(e) => handleDeleteSession(session.thread_id, e)}
                          disabled={isThisDeleting || !!deletingSessionId || isThisLoading || !!editingSessionId || isRenaming}
                          title={`Delete session ${session.thread_id}`}
                      >
                          &#x2715; {/* Multiplication sign 'X' */}
                      </button>
                    </div>
                  </>
                )}
                {/* --- END MODIFICATION --- */}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

SavedChatsPanel.propTypes = {
  onSelectSession: PropTypes.func.isRequired, // Callback when a session is clicked
  onRenameSession: PropTypes.func.isRequired, // <-- ADDED: Callback when session is renamed
};

export default SavedChatsPanel; 