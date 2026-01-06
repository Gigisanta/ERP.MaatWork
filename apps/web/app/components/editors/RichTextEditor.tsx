'use client';

/**
 * Rich Text Editor Component
 *
 * AI_DECISION: Usar TipTap como editor WYSIWYG
 * Justificación: Moderno, extensible, output HTML limpio, mejor UX que textarea
 * Impacto: Usuarios pueden formatear emails sin escribir HTML manualmente
 *
 * Features:
 * - Formato de texto (negrita, cursiva, listas)
 * - Inserción de enlaces
 * - Upload de imágenes
 * - Drag & drop de variables personalizadas
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Spinner } from '@maatwork/ui';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  onImageUpload,
  className = '',
}: RichTextEditorProps) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI_DECISION: Configurar TipTap con extensiones esenciales
  // Justificación: Balance entre funcionalidad y complejidad
  // Impacto: Editor completo pero no abrumador
  const editor = useEditor({
    immediatelyRender: false, // AI_DECISION: Evitar hydration mismatches en Next.js SSR
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: false, // Solo URLs, no base64
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Color,
      TextStyle,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-3',
      },
      // AI_DECISION: Soporte para drag & drop de texto (variables)
      // Justificación: Mantener funcionalidad existente de arrastrar variables
      // Impacto: UX consistente con versión anterior
      handleDrop: (view, event, slice, moved) => {
        // Si es un drop interno (moved), dejar que TipTap lo maneje
        if (moved) {
          return false;
        }

        // Obtener texto del drag
        const text = event.dataTransfer?.getData('text/plain');
        if (!text) {
          return false;
        }

        // Si es una variable (formato {variable}), insertarla
        if (text.match(/^\{[^}]+\}$/)) {
          const { state } = view;
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });

          if (pos) {
            const transaction = state.tr.insertText(text, pos.pos);
            view.dispatch(transaction);
            event.preventDefault();
            return true;
          }
        }

        return false;
      },
    },
  });

  // AI_DECISION: Sincronizar value prop con editor cuando cambia externamente
  // Justificación: Permite que el componente padre actualice el contenido
  // Impacto: Editor responde a cambios externos (ej: cargar configuración guardada)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const handleImageUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImageUpload || !editor) {
        return;
      }

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida');
        return;
      }

      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe superar 5MB');
        return;
      }

      try {
        setUploadingImage(true);
        const imageUrl = await onImageUpload(file);

        // Insertar imagen en el editor
        editor.chain().focus().setImage({ src: imageUrl }).run();
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error al subir la imagen. Por favor intenta de nuevo.');
      } finally {
        setUploadingImage(false);
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [editor, onImageUpload]
  );

  const handleAddLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL del enlace:', previousUrl);

    // Cancelado
    if (url === null) {
      return;
    }

    // Vacío = remover link
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // Establecer link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className={`rich-text-editor border border-border rounded-md ${className}`}>
      {/* Toolbar */}
      <div className="editor-toolbar flex flex-wrap gap-1 p-2 border-b border-border bg-background-subtle">
        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
          title="Negrita"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
          title="Cursiva"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
          title="Tachado"
        >
          <s>S</s>
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
          title="Lista con viñetas"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
          title="Lista numerada"
        >
          1.
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Link */}
        <button
          type="button"
          onClick={handleAddLink}
          className={`toolbar-btn ${editor.isActive('link') ? 'is-active' : ''}`}
          title="Insertar enlace"
        >
          🔗
        </button>

        {/* Image */}
        {onImageUpload && (
          <>
            <button
              type="button"
              onClick={handleImageUploadClick}
              disabled={uploadingImage}
              className="toolbar-btn"
              title="Insertar imagen"
            >
              {uploadingImage ? '⏳' : '🖼️'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        {/* Clear formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          className="toolbar-btn"
          title="Limpiar formato"
        >
          ✕
        </button>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}
