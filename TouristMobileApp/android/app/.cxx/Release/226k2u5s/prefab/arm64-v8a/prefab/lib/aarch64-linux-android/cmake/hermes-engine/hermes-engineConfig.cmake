if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "C:/Users/satad/.gradle/caches/8.14.3/transforms/d2f8226be1f2ea97f23b7310ec4fd93d/transformed/hermes-android-0.81.4-debugOptimized/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/satad/.gradle/caches/8.14.3/transforms/d2f8226be1f2ea97f23b7310ec4fd93d/transformed/hermes-android-0.81.4-debugOptimized/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

