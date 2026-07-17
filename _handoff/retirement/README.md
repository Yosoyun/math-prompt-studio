# Old-site retirement deployment

These files are a local deployment handoff only. Both pages redirect to:

`https://yosoyun.github.io/math-prompt-studio/`

## `ai-prompt-library-for-teachers`

1. Open the local checkout of the `ai-prompt-library-for-teachers` repository and confirm that you are on its deployment branch.
2. Copy this handoff file over that repository's root page:

   ```text
   math-prompt-studio/_handoff/retirement/ai-prompt-library-for-teachers/index.html
   → ai-prompt-library-for-teachers/index.html
   ```

3. Review the replacement:

   ```sh
   git diff -- index.html
   ```

4. Commit and push it from the old repository:

   ```sh
   git add index.html
   git commit -m "Redirect library to Maths Prompt Studio"
   git push
   ```

5. Open the old public URL in a private browser window. Confirm that it redirects to Maths Prompt Studio and that the fallback link works when automatic redirects are disabled.

## `limits-masterbook`

1. Open the local checkout of the `limits-masterbook` repository and confirm that you are on its deployment branch.
2. Copy this handoff file over that repository's root page:

   ```text
   math-prompt-studio/_handoff/retirement/limits-masterbook/index.html
   → limits-masterbook/index.html
   ```

3. Review the replacement:

   ```sh
   git diff -- index.html
   ```

4. Commit and push it from the old repository:

   ```sh
   git add index.html
   git commit -m "Redirect Limits Masterbook to Maths Prompt Studio"
   git push
   ```

5. Open the old public URL in a private browser window. Confirm that it redirects to Maths Prompt Studio and that the fallback link works when automatic redirects are disabled.

## Manual Vercel cleanup

`limits-masterbook.vercel.app` must be removed manually from the Vercel dashboard; these local files cannot remove it.

1. Sign in to Vercel and open the project that serves `limits-masterbook.vercel.app`.
2. Open **Settings → Domains** and remove `limits-masterbook.vercel.app`.
3. If the whole Vercel project is retired and has no other required deployment, delete the project from **Settings** as a separate manual action.
