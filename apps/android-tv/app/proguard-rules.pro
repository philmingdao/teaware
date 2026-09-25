# Teaware TV ProGuard Rules
# Add project specific ProGuard rules here.

# Keep Kotlin serialization classes
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}

-keep,includedescriptorclasses class io.github.philmingdao.teaware.**$$serializer { *; }
-keepclassmembers class io.github.philmingdao.teaware.** {
    *** Companion;
}
-keepclasseswithmembers class io.github.philmingdao.teaware.** {
    kotlinx.serialization.KSerializer serializer(...);
}
