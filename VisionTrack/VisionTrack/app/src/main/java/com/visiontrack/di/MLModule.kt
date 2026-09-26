package com.visiontrack.di

import android.content.Context
import com.visiontrack.ml.ObjectDetectionHelper
import com.visiontrack.ml.YOLOv8Detector
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object MLModule {

    @Provides @Singleton
    fun provideYOLOv8Detector(@ApplicationContext context: Context): YOLOv8Detector =
        YOLOv8Detector(context)

    @Provides @Singleton
    fun provideGeminiVisionDetector(): com.visiontrack.ml.GeminiVisionDetector =
        com.visiontrack.ml.GeminiVisionDetector()

    @Provides @Singleton
    fun provideObjectDetectionHelper(
        @ApplicationContext context: Context,
        detector: YOLOv8Detector,
        geminiDetector: com.visiontrack.ml.GeminiVisionDetector
    ): ObjectDetectionHelper = ObjectDetectionHelper(context, detector, geminiDetector)
}
