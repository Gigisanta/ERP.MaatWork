import React, { useState } from 'react';
import { Tag as TagIcon, Plus, X } from 'lucide-react';
import { Tag } from '../types/crm';
import { cn } from '../utils/cn';

interface TagsDisplayProps {
  tags: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
  onManageTags?: () => void;
  maxVisible?: number;
  className?: string;
  compact?: boolean;
}

const TagsDisplay: React.FC<TagsDisplayProps> = ({
  tags = [],
  onTagsChange,
  onManageTags,
  maxVisible = 2,
  className = '',
  compact = true
}) => {
  const [showAll, setShowAll] = useState(false);
  
  const visibleTags = showAll ? tags : tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;
  
  const handleRemoveTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTagsChange) {
      const updatedTags = tags.filter(tag => tag.id !== tagId);
      onTagsChange(updatedTags);
    }
  };
  
  const handleClick = () => {
    if (onManageTags) {
      onManageTags();
    }
  };
  
  if (tags.length === 0) {
    return (
      <div 
        onClick={handleClick}
        className={cn(
          "group flex items-center gap-1.5 p-2 rounded-lg border-2 border-dashed border-cactus-200 dark:border-cactus-700 hover:border-cactus-300 dark:hover:border-cactus-600 transition-all duration-200 cursor-pointer bg-cactus-50/30 dark:bg-cactus-900/10 hover:bg-cactus-50 dark:hover:bg-cactus-900/20",
          compact ? "min-h-[32px]" : "min-h-[40px]",
          className
        )}
      >
        <TagIcon className={cn(
          "text-cactus-500 dark:text-cactus-400 group-hover:text-cactus-600 dark:group-hover:text-cactus-300 transition-colors",
          compact ? "w-3 h-3" : "w-4 h-4"
        )} />
        <span className={cn(
          "text-cactus-600 dark:text-cactus-400 group-hover:text-cactus-700 dark:group-hover:text-cactus-300 font-medium transition-colors",
          compact ? "text-xs" : "text-sm"
        )}>
          Agregar etiquetas
        </span>
        <Plus className={cn(
          "text-cactus-500 dark:text-cactus-400 group-hover:text-cactus-600 dark:group-hover:text-cactus-300 transition-colors opacity-60 group-hover:opacity-100",
          compact ? "w-3 h-3" : "w-4 h-4"
        )} />
      </div>
    );
  }
  
  return (
    <div 
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-1.5 p-2 rounded-lg border border-cactus-200 dark:border-cactus-700 hover:border-cactus-300 dark:hover:border-cactus-600 transition-all duration-200 cursor-pointer bg-gradient-to-r from-cactus-50/50 to-cactus-100/30 dark:from-cactus-900/10 dark:to-cactus-800/10 hover:from-cactus-50 hover:to-cactus-100/50 dark:hover:from-cactus-900/20 dark:hover:to-cactus-800/20",
        compact ? "min-h-[32px]" : "min-h-[40px]",
        className
      )}
    >
      <TagIcon className={cn(
        "text-cactus-600 dark:text-cactus-400 group-hover:text-cactus-700 dark:group-hover:text-cactus-300 transition-colors flex-shrink-0",
        compact ? "w-3 h-3" : "w-4 h-4"
      )} />
      
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {visibleTags.map((tag) => (
          <div
            key={tag.id}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all duration-200 hover:scale-105 flex-shrink-0",
              compact ? "text-xs" : "text-sm"
            )}
            style={{
              backgroundColor: tag.backgroundColor,
              color: tag.color,
              borderColor: tag.color + '40'
            }}
          >
            <span className="font-medium truncate max-w-[60px]">{tag.name}</span>
            {onTagsChange && (
              <button
                onClick={(e) => handleRemoveTag(tag.id, e)}
                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                title={`Quitar ${tag.name}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ))}
        
        {hiddenCount > 0 && !showAll && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAll(true);
            }}
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full bg-cactus-100 dark:bg-cactus-800 text-cactus-700 dark:text-cactus-300 border border-cactus-300 dark:border-cactus-600 hover:bg-cactus-200 dark:hover:bg-cactus-700 transition-all duration-200 hover:scale-105 flex-shrink-0",
              compact ? "text-xs" : "text-sm"
            )}
          >
            +{hiddenCount}
          </button>
        )}
      </div>
      
      <Plus className={cn(
        "text-cactus-500 dark:text-cactus-400 group-hover:text-cactus-600 dark:group-hover:text-cactus-300 transition-colors opacity-60 group-hover:opacity-100 flex-shrink-0",
        compact ? "w-3 h-3" : "w-4 h-4"
      )} />
    </div>
  );
};

export default TagsDisplay;