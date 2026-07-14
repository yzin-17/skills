# API output layout

Use a single `.ts` file when the nearby feature has no established module grouping. For split output, inspect adjacent API modules first, preserve their filename and index-export convention, and assign each endpoint exactly once.

Do not invent a split layout. If no local convention is clear, ask the user to choose the directory, grouping, and optional index file.
