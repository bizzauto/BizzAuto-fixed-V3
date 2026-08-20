import React, { useState, useCallback, useMemo } from 'react';
import {
  Plus, GripVertical, Trash2, Type, Image, Video, Square,
  MousePointerClick, Minus, Code, Eye, Edit3, MoveUp, MoveDown,
  ChevronRight, X, Bold, Italic, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, Link,
} from 'lucide-react';

// ============================================================
// BLOCK TYPES
// ============================================================

export type BlockType = 'heading' | 'text' | 'image' | 'video' | 'button' | 'divider' | 'html' | 'form';

export interface Block {
  id: string;
  type: BlockType;
  content: Record<string, any>;
}

export const BLOCK_TYPE_META: Record<BlockType, { label: string; icon: React.ComponentType<any>; color: string; description: string }> = {
  heading: { label: 'Heading', icon: Type, color: 'text-blue-400', description: 'Page headline or subheading' },
  text: { label: 'Text', icon: AlignLeft, color: 'text-purple-400', description: 'Paragraph or rich text content' },
  image: { label: 'Image', icon: Image, color: 'text-emerald-400', description: 'Image with optional caption' },
  video: { label: 'Video', icon: Video, color: 'text-rose-400', description: 'Embedded YouTube/Vimeo video' },
  button: { label: 'Button', icon: MousePointerClick, color: 'text-amber-400', description: 'Call-to-action button' },
  divider: { label: 'Divider', icon: Minus, color: 'text-gray-400', description: 'Horizontal separator line' },
  html: { label: 'HTML', icon: Code, color: 'text-cyan-400', description: 'Custom HTML code block' },
  form: { label: 'Form', icon: Square, color: 'text-indigo-400', description: 'Lead capture form' },
};

export function createBlock(type: BlockType): Block {
  const id = `block-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const defaults: Record<BlockType, Record<string, any>> = {
    heading: { text: 'New Heading', level: 'h2', align: 'left' },
    text: { html: '<p>Enter your content here...</p>' },
    image: { src: '', alt: '', caption: '', width: '100%' },
    video: { url: '', type: 'youtube', autoplay: false },
    button: { text: 'Click Here', url: '#', style: 'primary', align: 'center' },
    divider: { style: 'solid', color: '#e5e7eb', thickness: '1px' },
    html: { code: '<!-- Custom HTML -->' },
    form: { fields: [{ type: 'text', label: 'Name', required: true, placeholder: 'Your name' }], submitText: 'Submit', style: 'stacked' },
  };
  return { id, type, content: defaults[type] || {} };
}

// ============================================================
// BLOCK RENDERER (visual preview within editor)
// ============================================================

function HeadingBlock({ content, onChange }: { content: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  const Tag = content.level || 'h2';
  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center gap-2">
        {['h1', 'h2', 'h3'].map(level => (
          <button
            key={level}
            onClick={() => onChange({ ...content, level })}
            className={`p-1.5 rounded text-xs font-medium transition-colors ${content.level === level ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          >{level === 'h1' ? <Heading1 size={14} /> : level === 'h2' ? <Heading2 size={14} /> : <Heading3 size={14} />}</button>
        ))}
      </div>
      <input
        type="text"
        value={content.text || ''}
        onChange={e => onChange({ ...content, text: e.target.value })}
        className={`w-full bg-transparent border-b border-gray-700 focus:border-blue-500 outline-none text-white placeholder-gray-600 ${
          content.level === 'h1' ? 'text-2xl font-bold' : content.level === 'h2' ? 'text-xl font-semibold' : 'text-lg font-medium'
        }`}
        placeholder="Heading text..."
      />
    </div>
  );
}

function TextBlock({ content, onChange }: { content: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  return (
    <div className="space-y-2 p-3">
      <textarea
        value={content.html || ''}
        onChange={e => onChange({ ...content, html: e.target.value })}
        rows={4}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
        placeholder="<p>Write your content with HTML tags...</p>"
      />
      <p className="text-[10px] text-gray-500">Supports HTML tags: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;a&gt;, &lt;ul&gt;</p>
    </div>
  );
}

function ImageBlock({ content, onChange }: { content: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  return (
    <div className="space-y-2 p-3">
      {content.src && (
        <div className="relative rounded-lg overflow-hidden bg-gray-800 mb-2">
          <img src={content.src} alt={content.alt || ''} className="max-h-32 w-full object-cover" />
        </div>
      )}
      <input
        type="url"
        value={content.src || ''}
        onChange={e => onChange({ ...content, src: e.target.value })}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="https://example.com/image.jpg"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={content.alt || ''}
          onChange={e => onChange({ ...content, alt: e.target.value })}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Alt text"
        />
        <input
          type="text"
          value={content.width || '100%'}
          onChange={e => onChange({ ...content, width: e.target.value })}
          className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="100%"
        />
      </div>
      <input
        type="text"
        value={content.caption || ''}
        onChange={e => onChange({ ...content, caption: e.target.value })}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Optional caption..."
      />
    </div>
  );
}

function VideoBlock({ content, onChange }: { content: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center gap-2">
        {['youtube', 'vimeo', 'loom'].map(type => (
          <button
            key={type}
            onClick={() => onChange({ ...content, type })}
            className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${content.type === type ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 border border-gray-700 hover:text-gray-300'}`}
          >{type}</button>
        ))}
      </div>
      <input
        type="url"
        value={content.url || ''}
        onChange={e => onChange({ ...content, url: e.target.value })}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="https://youtube.com/watch?v=..."
      />
      <label className="flex items-center gap-2 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={content.autoplay || false}
          onChange={e => onChange({ ...content, autoplay: e.target.checked })}
          className="rounded border-gray-600"
        />
        Autoplay
      </label>
    </div>
  );
}

function ButtonBlock({ content, onChange }: { content: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  return (
    <div className="space-y-2 p-3">
      <input
        type="text"
        value={content.text || ''}
        onChange={e => onChange({ ...content, text: e.target.value })}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Button text"
      />
      <input
        type="url"
        value={content.url || '#'}
        onChange={e => onChange({ ...content, url: e.target.value })}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="https://example.com/cta"
      />
      <div className="flex items-center gap-2">
        {['primary', 'secondary', 'outline', 'ghost'].map(style => (
          <button
            key={style}
            onClick={() => onChange({ ...content, style })}
            className={`px-2 py-1 rounded text-[10px] font-medium capitalize transition-colors ${content.style === style ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 border border-gray-700 hover:text-gray-300'}`}
          >{style}</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {['left', 'center', 'right'].map(align => (
          <button
            key={align}
            onClick={() => onChange({ ...content, align })}
            className={`p-1.5 rounded transition-colors ${content.align === align ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          >{align === 'left' ? <AlignLeft size={14} /> : align === 'center' ? <AlignCenter size={14} /> : <AlignRight size={14} />}</button>
        ))}
      </div>
    </div>
  );
}

function DividerBlock({ content, onChange }: { content: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center gap-2">
        {['solid', 'dashed', 'dotted'].map(style => (
          <button
            key={style}
            onClick={() => onChange({ ...content, style })}
            className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${content.style === style ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 border border-gray-700 hover:text-gray-300'}`}
          >{style}</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">Color</label>
        <input
          type="color"
          value={content.color || '#e5e7eb'}
          onChange={e => onChange({ ...content, color: e.target.value })}
          className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
        />
        <input
          type="text"
          value={content.thickness || '1px'}
          onChange={e => onChange({ ...content, thickness: e.target.value })}
          className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="1px"
        />
      </div>
    </div>
  );
}

function HtmlBlock({ content, onChange }: { content: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  return (
    <div className="p-3">
      <textarea
        value={content.code || ''}
        onChange={e => onChange({ ...content, code: e.target.value })}
        rows={5}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-green-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        placeholder="<!-- Custom HTML -->"
        spellCheck={false}
      />
    </div>
  );
}

function FormBlock({ content, onChange }: { content: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  const fields = content.fields || [];
  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">Form Fields</span>
        <button
          onClick={() => onChange({ ...content, fields: [...fields, { type: 'text', label: 'Field', required: false, placeholder: '' }] })}
          className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
        >
          <Plus size={10} /> Add Field
        </button>
      </div>
      {fields.map((field: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
          <input
            type="text"
            value={field.label || ''}
            onChange={e => {
              const newFields = [...fields];
              newFields[idx] = { ...field, label: e.target.value };
              onChange({ ...content, fields: newFields });
            }}
            className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none"
            placeholder="Field label"
          />
          <select
            value={field.type || 'text'}
            onChange={e => {
              const newFields = [...fields];
              newFields[idx] = { ...field, type: e.target.value };
              onChange({ ...content, fields: newFields });
            }}
            className="bg-gray-700 text-xs text-white rounded px-1.5 py-1 border-0 outline-none"
          >
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="textarea">Textarea</option>
          </select>
          <label className="flex items-center gap-1 text-[10px] text-gray-400">
            <input
              type="checkbox"
              checked={field.required || false}
              onChange={e => {
                const newFields = [...fields];
                newFields[idx] = { ...field, required: e.target.checked };
                onChange({ ...content, fields: newFields });
              }}
              className="rounded border-gray-600"
            />
            Req
          </label>
          <button
            onClick={() => onChange({ ...content, fields: fields.filter((_: any, i: number) => i !== idx) })}
            className="p-1 text-gray-500 hover:text-red-400"
          >
            <X size={10} />
          </button>
        </div>
      ))}
      <input
        type="text"
        value={content.submitText || 'Submit'}
        onChange={e => onChange({ ...content, submitText: e.target.value })}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Submit button text"
      />
    </div>
  );
}

// ============================================================
// BLOCK EDITOR COMPONENT
// ============================================================

function BlockEditorPanel({ block, onChange }: { block: Block; onChange: (block: Block) => void }) {
  const updateContent = useCallback((content: Record<string, any>) => {
    onChange({ ...block, content });
  }, [block, onChange]);

  const renderEditor = () => {
    switch (block.type) {
      case 'heading': return <HeadingBlock content={block.content} onChange={updateContent} />;
      case 'text': return <TextBlock content={block.content} onChange={updateContent} />;
      case 'image': return <ImageBlock content={block.content} onChange={updateContent} />;
      case 'video': return <VideoBlock content={block.content} onChange={updateContent} />;
      case 'button': return <ButtonBlock content={block.content} onChange={updateContent} />;
      case 'divider': return <DividerBlock content={block.content} onChange={updateContent} />;
      case 'html': return <HtmlBlock content={block.content} onChange={updateContent} />;
      case 'form': return <FormBlock content={block.content} onChange={updateContent} />;
      default: return <div className="p-3 text-sm text-gray-400">Unknown block type</div>;
    }
  };

  return (
    <div className="border-t border-gray-700 bg-gray-800/50">
      {renderEditor()}
    </div>
  );
}

// ============================================================
// MAIN FUNNEL BLOCK EDITOR
// ============================================================

interface FunnelBlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  disabled?: boolean;
}

export default function FunnelBlockEditor({ blocks, onChange, disabled }: FunnelBlockEditorProps) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index - 1]] = [newBlocks[index - 1], newBlocks[index]];
    onChange(newBlocks);
  }, [blocks, onChange]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= blocks.length - 1) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    onChange(newBlocks);
  }, [blocks, onChange]);

  const handleDelete = useCallback((index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
    setEditingBlockId(null);
  }, [blocks, onChange]);

  const handleAddBlock = useCallback((type: BlockType) => {
    const newBlock = createBlock(type);
    onChange([...blocks, newBlock]);
    setEditingBlockId(newBlock.id);
    setShowAddMenu(false);
  }, [blocks, onChange]);

  const handleUpdateBlock = useCallback((updatedBlock: Block) => {
    onChange(blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b));
  }, [blocks, onChange]);

  const blockTypesToShow = useMemo(() => {
    return (Object.keys(BLOCK_TYPE_META) as BlockType[]);
  }, []);

  return (
    <div className="space-y-1">
      {/* Block list */}
      {blocks.length === 0 && !disabled && (
        <div className="text-center py-6 border border-dashed border-gray-700 rounded-xl bg-gray-800/20">
          <p className="text-xs text-gray-500 mb-3">No content blocks yet</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[300px] mx-auto">
            {blockTypesToShow.map(type => {
              const meta = BLOCK_TYPE_META[type];
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  onClick={() => handleAddBlock(type)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 hover:text-white transition-colors border border-gray-700"
                >
                  <Icon size={12} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Block items */}
      {blocks.map((block, index) => {
        const meta = BLOCK_TYPE_META[block.type];
        const Icon = meta.icon;
        const isEditing = editingBlockId === block.id;

        return (
          <div key={block.id} className="group rounded-xl border border-gray-700 overflow-hidden bg-gray-800/30 hover:border-gray-600 transition-colors">
            {/* Block header */}
            <div
              className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 cursor-pointer select-none"
              onClick={() => setEditingBlockId(isEditing ? null : block.id)}
            >
              <div className="cursor-grab active:cursor-grabbing text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={14} />
              </div>
              <div className={`p-1 rounded ${meta.color.replace('text-', 'bg-').replace('400', '500/15')}`}>
                <Icon size={12} className={meta.color} />
              </div>
              <span className="text-xs font-medium text-gray-300 flex-1 truncate">
                {meta.label}
                {block.type === 'heading' && block.content.text && (
                  <span className="text-gray-500 font-normal ml-1">— {block.content.text}</span>
                )}
                {block.type === 'button' && block.content.text && (
                  <span className="text-gray-500 font-normal ml-1">— {block.content.text}</span>
                )}
              </span>
              <span className="text-[10px] text-gray-600">#{index + 1}</span>
              <button
                onClick={e => { e.stopPropagation(); handleMoveUp(index); }}
                disabled={index === 0}
                className="p-1 text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
              >
                <MoveUp size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleMoveDown(index); }}
                disabled={index >= blocks.length - 1}
                className="p-1 text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
              >
                <MoveDown size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setEditingBlockId(isEditing ? null : block.id); }}
                className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
              >
                <Edit3 size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(index); }}
                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Block editor */}
            {isEditing && (
              <BlockEditorPanel block={block} onChange={handleUpdateBlock} />
            )}
          </div>
        );
      })}

      {/* Add block button */}
      {blocks.length > 0 && !disabled && (
        <div className="relative pt-1">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-700 rounded-xl text-xs text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors bg-gray-800/10 hover:bg-gray-800/30"
          >
            <Plus size={14} />
            Add Block
          </button>

          {showAddMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-gray-800 border border-gray-700 rounded-xl p-2 shadow-xl grid grid-cols-4 gap-1">
              {blockTypesToShow.map(type => {
                const meta = BLOCK_TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    onClick={() => handleAddBlock(type)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-700 transition-colors"
                    title={meta.description}
                  >
                    <Icon size={16} className={meta.color} />
                    <span className="text-[10px] text-gray-400">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// BLOCK HTML RENDERER (for backend/preview)
// ============================================================

export function renderBlocksToHtml(blocks: Block[]): string {
  if (!blocks || blocks.length === 0) return '';

  return blocks.map(block => {
    const c = block.content;
    switch (block.type) {
      case 'heading': {
        const tag = c.level || 'h2';
        const align = c.align || 'left';
        return `<${tag} style="text-align:${align};margin:0 0 0.5rem 0;font-weight:700;line-height:1.3">${escapeHtml(c.text || '')}</${tag}>`;
      }
      case 'text':
        return `<div style="margin:0 0 0.5rem 0;line-height:1.6">${c.html || ''}</div>`;
      case 'image': {
        const src = c.src || '';
        if (!src) return '';
        const width = c.width || '100%';
        const maxWidth = width === '100%' ? '100%' : width;
        return `<div style="margin:0 0 0.5rem 0;text-align:center"><img src="${escapeHtml(src)}" alt="${escapeHtml(c.alt || '')}" style="max-width:${maxWidth};height:auto;border-radius:8px" />${c.caption ? `<p style="text-align:center;font-size:0.875rem;color:#6b7280;margin-top:0.25rem">${escapeHtml(c.caption)}</p>` : ''}</div>`;
      }
      case 'video': {
        const url = c.url || '';
        if (!url) return '';
        let embedUrl = url;
        if (c.type === 'youtube' && url.includes('watch?v=')) {
          embedUrl = url.replace('watch?v=', 'embed/').split('&')[0];
        } else if (c.type === 'vimeo' && url.includes('vimeo.com/')) {
          embedUrl = url.replace('vimeo.com', 'player.vimeo.com/video');
        }
        return `<div style="position:relative;padding-bottom:56.25%;height:0;margin:0 0 0.5rem 0"><iframe src="${escapeHtml(embedUrl)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:8px" frameborder="0" allow="autoplay;fullscreen" allowfullscreen></iframe></div>`;
      }
      case 'button': {
        const align = c.align || 'center';
        const btnText = c.text || 'Click Here';
        const btnUrl = c.url || '#';
        let btnStyle = '';
        switch (c.style || 'primary') {
          case 'primary': btnStyle = 'background:#3b82f6;color:white;padding:12px 32px;border-radius:8px;font-weight:600;font-size:1rem;border:none;cursor:pointer;display:inline-block;text-decoration:none';
            break;
          case 'secondary': btnStyle = 'background:#8b5cf6;color:white;padding:12px 32px;border-radius:8px;font-weight:600;font-size:1rem;border:none;cursor:pointer;display:inline-block;text-decoration:none';
            break;
          case 'outline': btnStyle = 'border:2px solid #3b82f6;color:#3b82f6;padding:10px 30px;border-radius:8px;font-weight:600;font-size:1rem;background:transparent;cursor:pointer;display:inline-block;text-decoration:none';
            break;
          case 'ghost': btnStyle = 'color:#3b82f6;padding:12px 32px;font-weight:600;font-size:1rem;background:transparent;cursor:pointer;display:inline-block;text-decoration:none';
            break;
        }
        return `<div style="text-align:${align};margin:0 0 0.5rem 0"><a href="${escapeHtml(btnUrl)}" style="${btnStyle}">${escapeHtml(btnText)}</a></div>`;
      }
      case 'divider': {
        const borderStyle = c.style || 'solid';
        const color = c.color || '#e5e7eb';
        const thickness = c.thickness || '1px';
        return `<hr style="border:none;border-top:${thickness} ${borderStyle} ${color};margin:1rem 0" />`;
      }
      case 'html':
        return c.code || '';
      case 'form': {
        const fields = c.fields || [];
        const submitText = c.submitText || 'Submit';
        const inputs = fields.map((f: any, i: number) => {
          const tag = f.type === 'textarea' ? 'textarea' : 'input';
          const inputProps = f.type !== 'textarea'
            ? `<input type="${f.type === 'phone' ? 'tel' : f.type}" name="field_${i}" placeholder="${escapeHtml(f.placeholder || f.label || '')}" ${f.required ? 'required' : ''} style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;margin-bottom:8px;box-sizing:border-box" />`
            : `<textarea name="field_${i}" placeholder="${escapeHtml(f.placeholder || f.label || '')}" ${f.required ? 'required' : ''} style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;margin-bottom:8px;box-sizing:border-box;resize:vertical;min-height:80px"></textarea>`;
          return `<div><label style="display:block;font-size:0.85rem;font-weight:500;margin-bottom:4px;color:#374151">${escapeHtml(f.label || '')}${f.required ? ' <span style="color:#ef4444">*</span>' : ''}</label>${inputProps}</div>`;
        }).join('\n');
        return `<form style="max-width:400px;margin:0 auto;padding:1rem">${inputs}<button type="submit" style="width:100%;padding:12px;background:#3b82f6;color:white;border:none;border-radius:6px;font-size:1rem;font-weight:600;cursor:pointer">${escapeHtml(submitText)}</button></form>`;
      }
      default:
        return '';
    }
  }).join('\n');
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, c => map[c] || c);
}
