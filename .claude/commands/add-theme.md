# /add-theme - Apply Beautiful Themes

You are a helpful assistant that guides users through applying beautiful, high-quality themes to their VibeCode Template app. This will update your Tailwind CSS configuration and global styles to match your chosen theme.

## What This Command Does

Applies a complete theme to your app including:
- Tailwind CSS color palette and design tokens
- Global CSS variables and styles
- Component styling updates
- Dark mode support (where applicable)

## Available Themes

### 1. **Vercel** - Clean and Professional
Modern, minimal design inspired by Vercel's aesthetic
- **Colors**: Neutral grays with subtle accents
- **Feel**: Clean, professional, minimalist
- **Best for**: SaaS platforms, developer tools, professional services

### 2. **Stripe** - Bold and Trustworthy  
Professional design with strong visual hierarchy
- **Colors**: Deep purples and clean whites
- **Feel**: Trustworthy, polished, enterprise-ready
- **Best for**: Financial apps, payment platforms, B2B tools

### 3. **Linear** - Sharp and Modern
Sleek interface with excellent contrast and typography
- **Colors**: Dark themes with vibrant accents
- **Feel**: Sharp, modern, productivity-focused
- **Best for**: Project management, productivity apps, developer tools

### 4. **Notion** - Warm and Approachable
Friendly design with soft colors and rounded elements
- **Colors**: Warm grays with gentle accent colors
- **Feel**: Approachable, friendly, creative
- **Best for**: Content platforms, creative tools, collaborative apps

### 5. **GitHub** - Technical and Reliable
Clean, developer-focused design with excellent readability
- **Colors**: Neutral grays with blue accents
- **Feel**: Technical, reliable, developer-friendly
- **Best for**: Developer tools, technical platforms, documentation sites

### 6. **Shadcn** - Elegant and Versatile
Beautiful design system with perfect balance
- **Colors**: Sophisticated grays with customizable accents
- **Feel**: Elegant, versatile, well-crafted
- **Best for**: Any application, highly customizable

## Step 1: Choose Your Theme

Pick one of the themes above based on your app's style and audience.

## Step 2: Apply Theme Configuration

### For Vercel Theme

**Update CSS Variables:**
- Open `client/src/index.css` and examine the existing CSS structure
- Replace the existing CSS custom properties (--background, --foreground, etc.) with Vercel theme values
- Maintain the existing @tailwind directives and @layer structure
- Update both light mode (:root) and dark mode (.dark) variable sets
- Use HSL color values for consistency with the existing system
- Preserve existing font-feature-settings and border utilities
```

### For Stripe Theme

**Apply Stripe Color System:**
- Update the CSS custom properties in `client/src/index.css`
- Replace existing color values with Stripe's purple-based color palette
- Maintain the existing CSS structure and @layer organization
- Update primary colors to use Stripe's signature purple (262 83% 58%)
- Adjust border radius to 0.75rem for Stripe's rounded aesthetic
- Keep existing Tailwind utilities and font settings
```

### For Linear Theme

**Implement Linear Color Scheme:**
- Replace CSS variables in `client/src/index.css` with Linear's blue-based system
- Use Linear's signature blue for primary actions (221 83% 53%)
- Apply dark theme optimizations with proper contrast ratios
- Maintain existing structural CSS and utility classes
- Keep moderate border radius (0.5rem) for Linear's modern aesthetic
```

### For Notion Theme

**Apply Notion's Warm Palette:**
- Update CSS variables with Notion's warm, approachable color system
- Use warm grays and subtle browns for better readability
- Implement gentle, rounded corners (0.75rem radius)
- Maintain accessibility with proper contrast ratios
- Keep existing CSS structure and Tailwind integration
```

### For GitHub Theme

**Implement GitHub Color System:**
- Replace existing CSS variables with GitHub's clean, technical color palette
- Use GitHub's signature blue for primary actions (212 100% 47%)
- Apply minimal border radius (0.375rem) for GitHub's sharp aesthetic
- Maintain neutral grays for professional, developer-focused appearance
- Keep existing font settings and utility classes
```

### For Shadcn Theme (Default)

**Maintain Shadcn Design System:**
- Keep the existing CSS variables as they follow shadcn/ui standards
- This theme is already optimized for the component library
- Maintain the balanced color palette and proper contrast ratios
- Keep the moderate border radius (0.5rem) for versatile design
- This is the safest option as it's designed for the UI components in use
```

## Step 3: Add Dark Mode Support (Optional)

**Dark Mode Implementation:**
- Study the existing App.tsx structure in `client/src/App.tsx`
- Add theme state management using React hooks
- Implement theme switching by adding/removing CSS classes on document root
- Create a theme toggle button using existing UI component patterns
- Position the toggle appropriately within the existing layout
- Use existing Tailwind classes for styling consistency
- Consider localStorage for theme persistence
- Follow existing component patterns for the toggle implementation
```

## Step 4: Test Your Theme

**Theme Verification:**
- Start development server with `npm run dev`
- Visit your app at http://localhost:5000 (following existing port configuration)
- Test all existing pages (dashboard, files, pricing, settings)
- Verify UI components from `client/src/components/ui/` work with new colors
- Check existing pages in `client/src/pages/` for consistent theming
- Test dark mode functionality if implemented
- Ensure all existing interactive elements maintain proper contrast

## Customizing Your Theme

**Theme Customization Options:**

1. **Adjusting colors**: Modify HSL values in the CSS variables within `client/src/index.css`
2. **Changing radius**: Update `--radius` variable for different corner roundness
3. **Adding custom colors**: Create new CSS variables following existing naming patterns
4. **Font changes**: Update font imports and apply them following existing patterns

**Custom Color Implementation:**
- Add new CSS variables to the existing :root and .dark selectors
- Follow the existing HSL format and naming conventions
- Use Tailwind's arbitrary value syntax with CSS variables
- Test custom colors with existing UI components
- Ensure accessibility compliance with proper contrast ratios

## Theme Preview

Each theme will update:
- **Buttons and CTAs** - Primary action colors
- **Cards and containers** - Background and border colors  
- **Text hierarchy** - Foreground and muted text colors
- **Form inputs** - Input styling and focus states
- **Navigation** - Header and sidebar styling

Your VibeCode Template will instantly transform with professional, cohesive styling that matches your chosen aesthetic!