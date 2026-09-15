#!/bin/sh
# Disposable export-test tool. Uses only shell builtins on a private PATH.
tool=${0##*/}
previous=
last=
blend=
exit_code=
for arg do
  if [ "$arg" = '--version' ]; then exit 0; fi
  if [ "$FAIL_TOOL" = "$tool" ]; then
    case "$arg" in
      *"$FAIL_INPUT"*) printf '%s: fixture access denied\n' "$tool" >&2; exit 7 ;;
    esac
  fi
  if [ "$previous" = '--background' ]; then blend=$arg; fi
  if [ "$previous" = '--python-exit-code' ]; then exit_code=$arg; fi
  if [ "$arg" = '--python' ]; then
    case "$exit_code" in
      ''|0|*[!0-9]*) exit 9 ;;
    esac
  fi
  previous=$arg
  penultimate=$last
  last=$arg
done
case "$tool" in
  blender)
    [ -n "$exit_code" ] || exit 9
    output=${blend%.blend}.tmp.glb
    ;;
  gltf-transform) output=$3 ;;
  toktx) output=$penultimate ;;
  magick) output=$last ;;
  *) exit 10 ;;
esac
if [ "$OMIT_TOOL" = "$tool" ]; then
  case "$output" in *"$OMIT_OUTPUT") exit 0 ;; esac
fi
printf '%s' 'stub export' > "$output"
