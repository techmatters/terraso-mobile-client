# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:
-keep class org.terraso.landpks.BuildConfig { *; }

-dontwarn com.google.android.gms.common.GoogleApiAvailability
-dontwarn com.google.android.gms.location.ActivityRecognition
-dontwarn com.google.android.gms.location.ActivityRecognitionClient
-dontwarn com.google.android.gms.location.ActivityRecognitionResult
-dontwarn com.google.android.gms.location.ActivityTransition$Builder
-dontwarn com.google.android.gms.location.ActivityTransition
-dontwarn com.google.android.gms.location.ActivityTransitionEvent
-dontwarn com.google.android.gms.location.ActivityTransitionRequest
-dontwarn com.google.android.gms.location.ActivityTransitionResult
-dontwarn com.google.android.gms.location.DetectedActivity
-dontwarn com.google.android.gms.location.FusedLocationProviderClient
-dontwarn com.google.android.gms.location.LocationCallback
-dontwarn com.google.android.gms.location.LocationRequest
-dontwarn com.google.android.gms.location.LocationResult
-dontwarn com.google.android.gms.location.LocationServices
-dontwarn com.google.android.gms.tasks.OnCanceledListener
-dontwarn com.google.android.gms.tasks.OnFailureListener
-dontwarn com.google.android.gms.tasks.OnSuccessListener
-dontwarn com.google.android.gms.tasks.RuntimeExecutionException
-dontwarn com.google.android.gms.tasks.Task
