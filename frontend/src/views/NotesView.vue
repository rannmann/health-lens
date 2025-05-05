<template>
  <div class="notes">
    <h1>Notes</h1>
    
    <!-- Add New Note Form -->
    <div class="note-form">
      <h2>Add Note</h2>
      <form @submit.prevent="addNote">
        <div class="form-group">
          <label for="title">Title</label>
          <input 
            id="title"
            v-model="newNote.title" 
            type="text" 
            required
          >
        </div>
        
        <div class="form-group">
          <label for="timestamp">Date & Time</label>
          <input
            id="timestamp"
            v-model="newNote.timestamp"
            type="datetime-local"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="content">Content</label>
          <textarea 
            id="content"
            v-model="newNote.content" 
            rows="3"
            required
          ></textarea>
        </div>
        
        <button type="submit">Add Note</button>
      </form>
    </div>

    <!-- Notes List -->
    <div class="notes-list">
      <h2>Notes History</h2>
      <div v-if="notes.length === 0" class="empty-state">
        No notes added yet.
      </div>
      <div v-else class="note-cards">
        <div v-for="note in notes" :key="note.timestamp" class="note-card">
          <div class="note-header">
            <h3>{{ note.title }}</h3>
            <div class="note-actions">
              <button @click="editNote(note)" class="edit-button">Edit</button>
              <button @click="deleteNote(note.timestamp)" class="delete-button">Delete</button>
            </div>
          </div>
          <p class="note-content">{{ note.content }}</p>
          <p class="note-timestamp">{{ formatDate(note.timestamp) }}</p>
        </div>
      </div>
    </div>

    <!-- Edit Note Modal -->
    <div v-if="editingNote" class="modal">
      <div class="modal-content">
        <h2>Edit Note</h2>
        <form @submit.prevent="saveEdit">
          <div class="form-group">
            <label for="edit-title">Title</label>
            <input 
              id="edit-title"
              v-model="editingNote.title" 
              type="text" 
              required
            >
          </div>
          
          <div class="form-group">
            <label for="edit-timestamp">Date & Time</label>
            <input
              id="edit-timestamp"
              v-model="editingNote.timestamp"
              type="datetime-local"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="edit-content">Content</label>
            <textarea 
              id="edit-content"
              v-model="editingNote.content" 
              rows="3"
              required
            ></textarea>
          </div>
          
          <div class="modal-actions">
            <button type="submit" class="save-button">Save</button>
            <button type="button" @click="cancelEdit" class="cancel-button">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../api/axios';
import { format } from 'date-fns';

interface Note {
  timestamp: string;
  title: string;
  content: string;
}

const notes = ref<Note[]>([]);
const newNote = ref({
  title: '',
  content: '',
  timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm")
});
const editingNote = ref<Note | null>(null);

const fetchNotes = async () => {
  try {
    const response = await api.get('/notes');
    notes.value = response.data;
  } catch (error) {
    console.error('Error fetching notes:', error);
  }
};

const addNote = async () => {
  if (!newNote.value.title || !newNote.value.content) return;
  
  try {
    await api.post('/notes', newNote.value);
    newNote.value = {
      title: '',
      content: '',
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm")
    };
    await fetchNotes();
  } catch (error) {
    console.error('Error adding note:', error);
  }
};

const editNote = (note: Note) => {
  editingNote.value = { ...note };
};

const saveEdit = async () => {
  if (!editingNote.value) return;
  
  try {
    await api.put(`/notes/${editingNote.value.timestamp}`, editingNote.value);
    editingNote.value = null;
    await fetchNotes();
  } catch (error) {
    console.error('Error updating note:', error);
  }
};

const cancelEdit = () => {
  editingNote.value = null;
};

const deleteNote = async (timestamp: string) => {
  if (!confirm('Are you sure you want to delete this note?')) return;
  
  try {
    await api.delete(`/notes/${timestamp}`);
    await fetchNotes();
  } catch (error) {
    console.error('Error deleting note:', error);
  }
};

const formatDate = (timestamp: string) => {
  return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
};

onMounted(() => {
  fetchNotes();
});
</script>

<style scoped>
.notes {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.note-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

input,
textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background: #45a049;
}

.notes-list {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.note-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.note-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.note-actions {
  display: flex;
  gap: 0.5rem;
}

.note-actions button {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.edit-button {
  background: #2196F3;
}

.edit-button:hover {
  background: #1976D2;
}

.delete-button {
  background: #f44336;
}

.delete-button:hover {
  background: #d32f2f;
}

.note-content {
  margin: 1rem 0;
  white-space: pre-wrap;
}

.note-timestamp {
  color: #666;
  font-size: 0.9em;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.save-button {
  background: #4CAF50;
}

.save-button:hover {
  background: #45a049;
}

.cancel-button {
  background: #f44336;
}

.cancel-button:hover {
  background: #d32f2f;
}
</style> 