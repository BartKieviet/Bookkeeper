# Developer notes

Starting this document so we can move lengthy comments from the source files,
explaining some decision or gotcha or whatever, to this document instead.  Keep
the sources leaner.

## Firefox CSS workarounds

We detect Firefox in stylesheets by its support of `-moz-appearance`.  It's a
bit dirty because that is not actually the "feature" we're trying to detect, but
I currently know no better way around this.  The thing is: in Firefox, URLs in
our stylesheets are resolved relative to the extension's root, as opposed to the
page they're injected on in Chrome.  So, in Firefox, we use absolute URLs.  And
we link to the secure Pardus website because, otherwise, if the user is playing
over HTTPS, there'll be lots of warnings about _"Loading mixed (insecure)
display content"_ in the console.

So all this means that, if the user plays in Firefox, and not over HTTPS, Bookie
will (slightly wastefully) load a couple gifs from the secure site, that's all.

Additionally, we currently have a second `@supports` query to deal with current
Firefox's lack of unprefixed `min-content` and `max-content` in width rules.
That one is proper use of `@supports`, and when Firefox supports the unprefixed
keywords we'll just remove it.
