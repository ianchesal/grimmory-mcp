#!/bin/bash
# Package Grimmory MCP skills for distribution

SKILLS_DIR="/home/tlba/Projects/grimmory-mcp/skills"
OUTPUT_DIR="/home/tlba/Projects/grimmory-mcp/dist/skills"

mkdir -p "$OUTPUT_DIR"

echo "Packaging Grimmory MCP Skills..."
echo "================================"

for skill_dir in "$SKILLS_DIR"/*/; do
    skill_name=$(basename "$skill_dir")
    output_file="$OUTPUT_DIR/${skill_name}.skill"
    
    echo "Packaging: $skill_name"
    
    # Create zip file with .skill extension
    (cd "$skill_dir" && zip -r "$output_file" . -x "*.git*" -x "node_modules/*")
    
    if [ -f "$output_file" ]; then
        size=$(du -h "$output_file" | cut -f1)
        echo "  ✓ Created: ${skill_name}.skill (${size})"
    else
        echo "  ✗ Failed to create: ${skill_name}.skill"
    fi
done

echo ""
echo "================================"
echo "Packaging complete!"
echo "Output directory: $OUTPUT_DIR"
echo ""
ls -lh "$OUTPUT_DIR"