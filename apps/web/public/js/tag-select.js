/**
 * Editor de etiquetas inline para contactos
 * Funcionalidad: autocompletado, creación de etiquetas, edición sin JS
 */

class TagSelector {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      apiUrl: options.apiUrl || '/api',
      contactId: options.contactId,
      maxVisibleTags: options.maxVisibleTags || 3,
      debounceMs: options.debounceMs || 250,
      ...options
    };
    
    this.tags = [];
    this.selectedTags = [];
    this.searchTerm = '';
    this.isLoading = false;
    this.abortController = null;
    this.debounceTimer = null;
    
    this.init();
  }

  init() {
    // Verificar si JS está habilitado
    if (!this.container.dataset.jsEnabled) {
      this.container.classList.add('no-js');
      return;
    }

    this.container.classList.add('tag-container');
    this.setupEventListeners();
    this.loadContactTags();
  }

  setupEventListeners() {
    // Click en el contenedor para activar
    this.container.addEventListener('click', (e) => {
      if (!this.container.classList.contains('focused')) {
        this.focus();
      }
    });

    // Click fuera para desactivar
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.blur();
      }
    });

    // Navegación con teclado
    this.container.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    // Input de búsqueda
    const input = this.container.querySelector('.tag-search-input');
    if (input) {
      input.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
    }
  }

  async loadContactTags() {
    if (!this.options.contactId) return;

    try {
      const response = await fetch(`${this.options.apiUrl}/tags/contacts/${this.options.contactId}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.selectedTags = data.data || [];
        this.render();
      }
    } catch (error) {
      console.error('Error loading contact tags:', error);
    }
  }

  async searchTags(query) {
    if (!query.trim()) {
      this.tags = [];
      this.renderDropdown();
      return;
    }

    // Cancelar búsqueda anterior
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();
    this.isLoading = true;
    this.renderDropdown();

    try {
      const response = await fetch(
        `${this.options.apiUrl}/tags?scope=contact&q=${encodeURIComponent(query)}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          signal: this.abortController.signal,
        }
      );

      if (response.ok) {
        const data = await response.json();
        this.tags = data.data || [];
      } else {
        this.tags = [];
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error searching tags:', error);
        this.tags = [];
      }
    } finally {
      this.isLoading = false;
      this.abortController = null;
      this.renderDropdown();
    }
  }

  handleSearch(query) {
    this.searchTerm = query;
    
    // Debounce la búsqueda
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.searchTags(query);
    }, this.options.debounceMs);
  }

  async addTag(tagOrName) {
    let tag;
    
    if (typeof tagOrName === 'string') {
      // Crear nueva etiqueta
      tag = await this.createTag(tagOrName);
    } else {
      tag = tagOrName;
    }

    if (tag && !this.selectedTags.find(t => t.id === tag.id)) {
      this.selectedTags.push(tag);
      await this.saveContactTags();
      this.render();
    }

    // Limpiar búsqueda
    const input = this.container.querySelector('.tag-search-input');
    if (input) {
      input.value = '';
      this.searchTerm = '';
      this.tags = [];
      this.renderDropdown();
    }
  }

  async removeTag(tagId) {
    this.selectedTags = this.selectedTags.filter(t => t.id !== tagId);
    await this.saveContactTags();
    this.render();
  }

  async createTag(name) {
    try {
      const response = await fetch(`${this.options.apiUrl}/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scope: 'contact',
          name: name.trim(),
          color: '#6B7280'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    }
    return null;
  }

  async saveContactTags() {
    if (!this.options.contactId) return;

    try {
      const response = await fetch(`${this.options.apiUrl}/tags/contacts/${this.options.contactId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          add: this.selectedTags.map(t => t.id),
          remove: []
        }),
      });

      if (!response.ok) {
        console.error('Error saving contact tags');
      }
    } catch (error) {
      console.error('Error saving contact tags:', error);
    }
  }

  render() {
    const visibleTags = this.selectedTags.slice(0, this.options.maxVisibleTags);
    const hiddenCount = this.selectedTags.length - this.options.maxVisibleTags;

    this.container.innerHTML = `
      ${visibleTags.map(tag => `
        <span class="tag-chip removable">
          ${tag.icon ? `${tag.icon} ` : ''}${tag.name}
          <button type="button" class="remove-btn" data-tag-id="${tag.id}">×</button>
        </span>
      `).join('')}
      
      ${hiddenCount > 0 ? `
        <span class="tag-counter">+${hiddenCount}</span>
      ` : ''}
      
      <input 
        type="text" 
        class="tag-search-input" 
        placeholder="Agregar etiqueta..."
        autocomplete="off"
      />
      
      <div class="tag-dropdown" style="display: none;"></div>
    `;

    // Reconfigurar event listeners
    this.setupEventListeners();
    
    // Event listeners para botones de eliminar
    this.container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTag(e.target.dataset.tagId);
      });
    });
  }

  renderDropdown() {
    const dropdown = this.container.querySelector('.tag-dropdown');
    if (!dropdown) return;

    if (this.isLoading) {
      dropdown.innerHTML = '<div class="tag-dropdown-item">Buscando...</div>';
      dropdown.style.display = 'block';
      return;
    }

    if (this.searchTerm && this.tags.length === 0) {
      dropdown.innerHTML = `
        <div class="tag-dropdown-item create-option" data-action="create">
          Crear "${this.searchTerm}"
        </div>
      `;
      dropdown.style.display = 'block';
      return;
    }

    if (this.tags.length > 0) {
      dropdown.innerHTML = this.tags
        .filter(tag => !this.selectedTags.find(t => t.id === tag.id))
        .map(tag => `
          <div class="tag-dropdown-item" data-tag-id="${tag.id}">
            <div class="tag-info">
              <span class="tag-color" style="background-color: ${tag.color}"></span>
              <span class="tag-name">${tag.name}</span>
            </div>
          </div>
        `).join('') + (this.searchTerm ? `
          <div class="tag-dropdown-item create-option" data-action="create">
            Crear "${this.searchTerm}"
          </div>
        ` : '');
      dropdown.style.display = 'block';
    } else {
      dropdown.style.display = 'none';
    }

    // Event listeners para items del dropdown
    dropdown.querySelectorAll('.tag-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (item.dataset.action === 'create') {
          this.addTag(this.searchTerm);
        } else if (item.dataset.tagId) {
          const tag = this.tags.find(t => t.id === item.dataset.tagId);
          if (tag) {
            this.addTag(tag);
          }
        }
      });
    });
  }

  handleKeydown(e) {
    const dropdown = this.container.querySelector('.tag-dropdown');
    const items = dropdown?.querySelectorAll('.tag-dropdown-item');
    
    if (!items || items.length === 0) {
      if (e.key === 'Enter' && this.searchTerm) {
        e.preventDefault();
        this.addTag(this.searchTerm);
      }
      return;
    }

    const current = dropdown.querySelector('.tag-dropdown-item.selected');
    let index = current ? Array.from(items).indexOf(current) : -1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        index = Math.min(index + 1, items.length - 1);
        this.selectDropdownItem(items[index]);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        index = Math.max(index - 1, 0);
        this.selectDropdownItem(items[index]);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (current) {
          current.click();
        } else if (this.searchTerm) {
          this.addTag(this.searchTerm);
        }
        break;
        
      case 'Escape':
        this.blur();
        break;
    }
  }

  selectDropdownItem(item) {
    const dropdown = this.container.querySelector('.tag-dropdown');
    dropdown?.querySelectorAll('.tag-dropdown-item').forEach(i => {
      i.classList.remove('selected');
    });
    item?.classList.add('selected');
  }

  focus() {
    this.container.classList.add('focused');
    const input = this.container.querySelector('.tag-search-input');
    input?.focus();
  }

  blur() {
    this.container.classList.remove('focused');
    const dropdown = this.container.querySelector('.tag-dropdown');
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  }

  getAuthToken() {
    // Obtener token de autenticación (implementar según tu sistema)
    return localStorage.getItem('auth_token') || '';
  }
}

// Auto-inicialización
document.addEventListener('DOMContentLoaded', () => {
  // Marcar contenedores como habilitados para JS
  document.querySelectorAll('.tag-selector').forEach(container => {
    container.dataset.jsEnabled = 'true';
    
    const contactId = container.dataset.contactId;
    const apiUrl = container.dataset.apiUrl || '/api';
    
    if (contactId) {
      new TagSelector(container, {
        contactId,
        apiUrl
      });
    }
  });

  // Fallback para formularios sin JS
  document.querySelectorAll('.tag-fallback').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const contactId = form.dataset.contactId;
      const input = form.querySelector('.tag-fallback-input');
      const button = form.querySelector('.tag-fallback-btn');
      
      if (!contactId || !input) return;
      
      const tagsText = input.value.trim();
      if (!tagsText) return;
      
      // Parsear etiquetas separadas por comas
      const tagNames = tagsText.split(',').map(name => name.trim()).filter(Boolean);
      
      button.disabled = true;
      button.textContent = 'Guardando...';
      
      try {
        const response = await fetch(`/api/tags/contacts/${contactId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            add: tagNames,
            remove: []
          }),
        });
        
        if (response.ok) {
          // Recargar página para mostrar cambios
          window.location.reload();
        } else {
          alert('Error al guardar etiquetas');
        }
      } catch (error) {
        console.error('Error saving tags:', error);
        alert('Error al guardar etiquetas');
      } finally {
        button.disabled = false;
        button.textContent = 'Guardar';
      }
    });
  });
});

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TagSelector;
}


