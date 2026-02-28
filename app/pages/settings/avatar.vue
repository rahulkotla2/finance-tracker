<template>
    <div>
        <div class="mb-4">
            <UFormField label="Current avatar" name="currentAvatar" class="w-full"
                help="This would be blank by default">
                <UAvatar src="https://avatars.githubusercontent.com/u/739984?v=4" size="3xl" />
            </UFormField>
        </div>

        <div class="mb-4">
            <UFormField label="New avatar" name="newAvatar" class="w-full"
                help="After choosing an image click Save to actually upload the new avatar">
                <UInput type="file" ref="fileInput" />
            </UFormField>
        </div>

        <UButton type="submit" color="neutral" variant="solid" label="Save" :loading="uploading" :disabled="uploading"
            @click="saveAvatar" />
    </div>
</template>

<script setup>
const supabase = useSupabaseClient()
const user = useSupabaseUser()

// We need to get the actual avatar URL
const { toastSuccess, toastError } = useAppToast()

const uploading = ref(false)
const fileInput = ref(null) // Reference to an input with ref="fileInput" attribute
console.log(user.value)

const saveAvatar = async () => {
    // 1. Get the uploaded file
    //    a) If no file uploaded, show toast error
    // 2. Generate the new filename
    const file = fileInput.value.inputRef.files[0]
    if (!file) {
        toastError({
            title: 'Select an image to upload first',
        })
        return
    }
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    console.log(fileName)

    try {
        uploading.value = true
        // 1. Grab the current avatar URL
        const currentAvatarUrl = user.value.user_metadata?.avatar_url
        // 2. Upload the image to avatars bucket
        const { data, error } = await supabase
            .storage
            .from('avatars')
            .upload(fileName, file)

        if (error) throw error
        // 3. Update the user metadata with the avatar URL
        const { error: updateError } = await supabase.auth.updateUser({
            data: {
                avatar_url: fileName
            }
        })
        if (updateError) throw updateError
        // 4. (OPTIONALLY) remove the old avatar file
        console.log(currentAvatarUrl)
        if (currentAvatarUrl) {
            const { error: deleteError } = await supabase.storage.from('avatars').remove([currentAvatarUrl])
            if (deleteError) throw deleteError
        }

        // 5. Refresh the user metadata
        await supabase.auth.refreshSession()

        // 6. Reset the file input
        fileInput.value.inputRef.value = null

        toastSuccess({
            title: 'Avatar uploaded',
        })
    } catch (error) {
        toastError({
            title: 'Error uploading avatar',
            description: error.message
        })
    } finally {
        uploading.value = false
    }
}
</script>