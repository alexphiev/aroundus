#!/bin/bash
# Clear Overture Maps cached files

CACHE_DIR="temp/overture"

echo "🗂️  Clearing Overture Maps cache..."

if [ -d "$CACHE_DIR" ]; then
    echo "📁 Found cache directory: $CACHE_DIR"
    
    # Count files before deletion
    FILE_COUNT=$(find "$CACHE_DIR" -name "overture_places_dept_*.geojson" | wc -l)
    
    if [ "$FILE_COUNT" -eq 0 ]; then
        echo "✅ No cached files found"
    else
        echo "🗑️  Found $FILE_COUNT cached department files"
        
        # List files to be deleted
        echo "📋 Files to be deleted:"
        find "$CACHE_DIR" -name "overture_places_dept_*.geojson" -exec basename {} \;
        
        # Ask for confirmation
        read -p "❓ Are you sure you want to delete all cached files? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Delete cached files
            find "$CACHE_DIR" -name "overture_places_dept_*.geojson" -delete
            echo "✅ Cleared $FILE_COUNT cached files"
        else
            echo "❌ Cache clearing cancelled"
        fi
    fi
else
    echo "📁 Cache directory doesn't exist: $CACHE_DIR"
fi

echo "🎉 Done!"