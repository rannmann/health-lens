<template>
  <div class="notes-container">
    <h1>Notes</h1>
    
    <!-- Add New Note Form -->
    <div class="add-note-form">
      <input 
        v-model="newNote.title" 
        type="text" 
        placeholder="Note title"
        class="note-input"
      >
      <textarea 
        v-model="newNote.content" 
        placeholder="Write your note here..."
        class="note-textarea"
      ></textarea>
      <button @click="addNote" class="add-button">Add Note</button>
    </div>

    <!-- Notes List -->
    <div class="notes-list">
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

    <!-- Edit Note Modal -->
    <div v-if="editingNote" class="modal">
      <div class="modal-content">
        <h2>Edit Note</h2>
        <input 
          v-model="editingNote.title" 
          type="text" 
          placeholder="Note title"
          class="note-input"
        >
        <textarea 
          v-model="editingNote.content" 
          placeholder="Write your note here..."
          class="note-textarea"
        ></textarea>
        <div class="modal-actions">
          <button @click="saveEdit" class="save-button">Save</button>
          <button @click="cancelEdit" class="cancel-button">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';

interface Note {
  timestamp: string;
  title: string;
  content: string;
}

const notes = ref<Note[]>([]);
const newNote = ref({ title: '', content: '' });
const editingNote = ref<Note | null>(null);

const fetchNotes = async () => {
  try {
    const response = await axios.get('/api/notes');
    notes.value = response.data;
  } catch (error) {
    console.error('Error fetching notes:', error);
  }
};

const addNote = async () => {
  if (!newNote.value.title || !newNote.value.content) return;
  
  try {
    await axios.post('/api/notes', {
      ...newNote.value,
      timestamp: new Date().toISOString()
    });
    newNote.value = { title: '', content: '' };
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
    await axios.put(`/api/notes/${editingNote.value.timestamp}`, editingNote.value);
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
    await axios.delete(`/api/notes/${timestamp}`);
    await fetchNotes();
  } catch (error) {
    console.error('Error deleting note:', error);
  }
};

const formatDate = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

onMounted(() => {
  fetchNotes();
});
</script>

<style scoped>
.notes-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.add-note-form {
  margin-bottom: 30px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.note-input {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.note-textarea {
  width: 100%;
  height: 100px;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
}

.add-button {
  background: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.notes-list {
  display: grid;
  gap: 20px;
}

.note-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.note-actions {
  display: flex;
  gap: 10px;
}

.edit-button, .delete-button {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.edit-button {
  background: #2196F3;
  color: white;
}

.delete-button {
  background: #f44336;
  color: white;
}

.note-content {
  margin: 10px 0;
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
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.save-button, .cancel-button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.save-button {
  background: #4CAF50;
  color: white;
}

.cancel-button {
  background: #f44336;
  color: white;
}
</style> 